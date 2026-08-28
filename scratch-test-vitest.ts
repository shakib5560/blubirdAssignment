import { Test, TestingModule } from '@nestjs/testing';
import { CatalogAssistantService } from '../code/src/assistant/catalog-assistant.service';
import { PrismaService } from '../code/src/prisma/prisma.module';
import { OrderService } from '../code/src/order/order.service';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock global fetch for Groq
global.fetch = vi.fn();

// Mock GoogleGenAI
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        chats: {
          create: vi.fn(),
        },
      };
    }),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      ARRAY: 'ARRAY'
    }
  };
});

describe('CatalogAssistantService', () => {
  let service: CatalogAssistantService;
  let prismaService: any;
  let orderService: any;
  let genAIMock: any;
  let chatMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogAssistantService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: vi.fn(),
            },
            order: {
              findUnique: vi.fn(),
            },
            customer: {
              findUnique: vi.fn(),
            }
          },
        },
        {
          provide: OrderService,
          useValue: {
            create: vi.fn(),
          }
        }
      ],
    }).compile();

    service = module.get<CatalogAssistantService>(CatalogAssistantService);
    prismaService = module.get(PrismaService);
    orderService = module.get(OrderService);
    
    genAIMock = (service as any).genAI;
    chatMock = {
      sendMessage: vi.fn()
    };
    genAIMock.chats.create.mockReturnValue(chatMock);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Path Tests', () => {
    it('should handle search_products tool call correctly', async () => {
      // Setup the initial response with a tool call
      chatMock.sendMessage.mockResolvedValueOnce({
        functionCalls: [{
          name: 'search_products',
          args: { query: 'Laptop' }
        }]
      });

      // Setup the tool execution result
      prismaService.product.findMany.mockResolvedValue([
        { id: '1', name: 'Laptop', description: 'A fast laptop', price: 999.99, stockQuantity: 10 }
      ]);

      // Setup the final LLM response
      chatMock.sendMessage.mockResolvedValueOnce({
        text: 'We have a fast Laptop for $999.99.'
      });

      const result = await service.getAssistantResponse('Do you have laptops?');
      expect(result).toBe('We have a fast Laptop for $999.99.');
      expect(prismaService.product.findMany).toHaveBeenCalled();
      
      const secondCallArgs = chatMock.sendMessage.mock.calls[1][0];
      expect(secondCallArgs.message[0].functionResponse.response.products[0].name).toBe('Laptop');
    });

    it('should handle check_order tool call correctly', async () => {
      chatMock.sendMessage.mockResolvedValueOnce({
        functionCalls: [{
          name: 'check_order',
          args: { order_id: '123' }
        }]
      });

      prismaService.order.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
        totalAmount: 50,
        createdAt: new Date(),
        items: [{ product: { name: 'Mouse' }, quantity: 1 }]
      });

      chatMock.sendMessage.mockResolvedValueOnce({
        text: 'Your order is CONFIRMED.'
      });

      const result = await service.getAssistantResponse('Check order 123');
      expect(result).toBe('Your order is CONFIRMED.');
      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: { items: { include: { product: true } } }
      });
    });

    it('should place an order successfully', async () => {
      chatMock.sendMessage.mockResolvedValueOnce({
        functionCalls: [{
          name: 'place_order',
          args: { customer_email: 'test@test.com', items: [{ product_id: '1', quantity: 2 }] }
        }]
      });

      prismaService.customer.findUnique.mockResolvedValue({ id: 'cus_1' });
      orderService.create.mockResolvedValue({ id: 'ord_1', totalAmount: 100, status: 'CONFIRMED' });

      chatMock.sendMessage.mockResolvedValueOnce({
        text: 'Order placed successfully.'
      });

      const result = await service.getAssistantResponse('Place order');
      expect(result).toBe('Order placed successfully.');
      expect(orderService.create).toHaveBeenCalledWith({
        customerId: 'cus_1',
        items: [{ productId: '1', quantity: 2 }]
      });
    });
  });

  describe('Adversarial & Edge Cases', () => {
    it('Adversarial 1: should handle placing order with more stock than available gracefully', async () => {
      chatMock.sendMessage.mockResolvedValueOnce({
        functionCalls: [{
          name: 'place_order',
          args: { customer_email: 'test@test.com', items: [{ product_id: '1', quantity: 100 }] }
        }]
      });

      prismaService.customer.findUnique.mockResolvedValue({ id: 'cus_1' });
      orderService.create.mockRejectedValue(new BadRequestException('Insufficient stock'));

      chatMock.sendMessage.mockImplementation(async (req: any) => {
        if (req.message && req.message[0] && req.message[0].functionResponse) {
           return { text: 'Sorry, we do not have that much stock.' };
        }
        return {};
      });

      const result = await service.getAssistantResponse('Buy 100 laptops');
      expect(result).toBe('Sorry, we do not have that much stock.');
      
      const secondCallArgs = chatMock.sendMessage.mock.calls[1][0];
      expect(secondCallArgs.message[0].functionResponse.response.error).toBe('Insufficient stock');
    });

    it('Adversarial 2: should handle checking an invalid order id gracefully', async () => {
      chatMock.sendMessage.mockResolvedValueOnce({
        functionCalls: [{
          name: 'check_order',
          args: { order_id: 'invalid_123' }
        }]
      });

      prismaService.order.findUnique.mockResolvedValue(null);

      chatMock.sendMessage.mockResolvedValueOnce({
        text: 'Order not found.'
      });

      const result = await service.getAssistantResponse('Check order invalid_123');
      expect(result).toBe('Order not found.');
      
      const secondCallArgs = chatMock.sendMessage.mock.calls[1][0];
      expect(secondCallArgs.message[0].functionResponse.response.error).toBe('Order not found');
    });
  });

  describe('Fallback Strategy Tests', () => {
    it('should catch error and route to fallback model (Groq) on timeout', async () => {
      genAIMock.chats.create.mockImplementation(() => {
        throw new Error('Timeout');
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Fallback response' } }],
        }),
      });

      const result = await service.getAssistantResponse('Hello');
      
      expect(result).toBe('Fallback response');
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
