import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { OrderService } from '../order/order.service';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable()
export class CatalogAssistantService {
  private readonly logger = new Logger(CatalogAssistantService.name);
  private readonly genAI: GoogleGenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
    });
  }

  async getAssistantResponse(userMessage: string): Promise<string> {
    const systemPrompt = `You are a helpful customer support AI for our store.
You have access to tools to search the product catalog, check order statuses, and place orders.
Use these tools when the user requests information or actions related to products or orders.
If a user asks to buy something, ask for their email and the specific products/quantities if not provided, then use the place_order tool.
If a user tries to order more stock than available, inform them of the limit based on the tool response.
Do NOT make up products, prices, inventory, or orders.`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'search_products',
            description: 'Searches the product catalog by name or description, with an optional maximum price limit.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: 'The search query (product name or description).' },
                max_price: { type: Type.NUMBER, description: 'Optional maximum price limit.' },
              },
              required: ['query'],
            },
          },
          {
            name: 'check_order',
            description: 'Checks the status and total amount of a specific order.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                order_id: { type: Type.STRING, description: 'The ID of the order to check.' },
              },
              required: ['order_id'],
            },
          },
          {
            name: 'place_order',
            description: 'Places a new order for a customer given their email and a list of items.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                customer_email: { type: Type.STRING, description: 'The email of the customer placing the order.' },
                items: {
                  type: Type.ARRAY,
                  description: 'List of items to order.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      product_id: { type: Type.STRING, description: 'The ID of the product.' },
                      quantity: { type: Type.NUMBER, description: 'The quantity to order.' },
                    },
                    required: ['product_id', 'quantity'],
                  },
                },
              },
              required: ['customer_email', 'items'],
            },
          }
        ]
      }
    ];

    try {
      this.logger.log('Attempting to use primary provider (Gemini 3.6 Flash)...');
      
      const chat = this.genAI.chats.create({
        model: 'gemini-3.6-flash',
        config: {
          systemInstruction: systemPrompt,
          tools: tools,
        }
      });

      let response = await chat.sendMessage({ message: userMessage });

      // Execution Loop
      while (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0];
        const { name, args } = functionCall;
        
        let functionResponse: any;

        try {
          if (name === 'search_products') {
            const query = args.query as string;
            const maxPrice = args.max_price as number | undefined;
            const whereClause: any = {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            };
            if (maxPrice !== undefined) {
              whereClause.price = { lte: maxPrice };
            }
            const products = await this.prisma.product.findMany({
              where: whereClause,
              select: { id: true, name: true, description: true, price: true, stockQuantity: true },
              take: 10,
            });
            functionResponse = { products };
          } else if (name === 'check_order') {
            const orderId = args.order_id as string;
            const order = await this.prisma.order.findUnique({
              where: { id: orderId },
              include: {
                items: { include: { product: true } },
              },
            });
            if (!order) {
              functionResponse = { error: 'Order not found' };
            } else {
              functionResponse = { 
                status: order.status, 
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                items: order.items.map(i => ({ name: i.product.name, quantity: i.quantity }))
              };
            }
          } else if (name === 'place_order') {
            const customerEmail = args.customer_email as string;
            const items = args.items as Array<{ product_id: string, quantity: number }>;
            
            const customer = await this.prisma.customer.findUnique({
              where: { email: customerEmail }
            });
            
            if (!customer) {
              functionResponse = { error: 'Customer not found with the provided email.' };
            } else {
              const order = await this.orderService.create({
                customerId: customer.id,
                items: items.map(item => ({ productId: item.product_id, quantity: item.quantity }))
              });
              functionResponse = { success: true, orderId: order.id, totalAmount: order.totalAmount, status: order.status };
            }
          } else {
            functionResponse = { error: 'Unknown function' };
          }
        } catch (error: any) {
          functionResponse = { error: error.message };
        }

        response = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: name,
              response: functionResponse
            }
          }]
        });
      }

      if (!response.text) {
        throw new Error('No text returned from Gemini');
      }
      return response.text;
    } catch (error) {
      this.logger.error('Primary provider failed. Falling back to Llama 3.3 70B via Groq.', error);
      return this.fallbackToLlama(systemPrompt, userMessage);
    }
  }

  private async fallbackToLlama(systemPrompt: string, userMessage: string): Promise<string> {
    const groqApiKey = process.env.GROQ_API_KEY || 'dummy_key';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Groq fallback failed: ${errText}`);
      throw new Error('All AI providers failed.');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
