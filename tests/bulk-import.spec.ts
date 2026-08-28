import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../src/product/product.controller';
import { ProductService } from '../src/product/product.service';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Bulk Import', () => {
  let controller: ProductController;
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: {
            bulkImport: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call bulkImport on valid URL', async () => {
    const url = 'https://example.com/catalog.csv';
    (service.bulkImport as any).mockResolvedValue({ inserted: 5, updated: 0, failed: 0, message: 'Success' });
    
    const result = await controller.bulkImport({ url });
    
    expect(service.bulkImport).toHaveBeenCalledWith(url);
    expect(result.inserted).toBe(5);
  });
});
