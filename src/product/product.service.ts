import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(skip?: number, take?: number, search?: string) {
    return this.prisma.product.findMany({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
