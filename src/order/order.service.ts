import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify customer
      const customer = await tx.customer.findUnique({
        where: { id: createOrderDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      let totalAmount = new Prisma.Decimal(0);
      const orderItemsData = [];

      // 2. Process each item
      for (const item of createOrderDto.items) {
        // Lock the row for update (if using PostgreSQL, Prisma currently requires raw query for FOR UPDATE,
        // but checking and updating inside transaction provides basic atomicity. We will use update with where condition to prevent race conditions.)
        
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.stockQuantity}`,
          );
        }

        // Deduct stock safely to avoid race conditions (optimistic-like concurrency control)
        const updatedProduct = await tx.product.update({
          where: { 
            id: item.productId,
            stockQuantity: { gte: item.quantity } // Ensure stock is still enough
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        }).catch(() => {
           throw new BadRequestException(`Insufficient stock for product ${product.name} during checkout.`);
        });

        const itemTotal = updatedProduct.price.mul(item.quantity);
        totalAmount = totalAmount.add(itemTotal);

        orderItemsData.push({
          productId: updatedProduct.id,
          quantity: item.quantity,
          unitPrice: updatedProduct.price,
        });
      }

      // 3. Create order
      return tx.order.create({
        data: {
          customerId: customer.id,
          totalAmount,
          status: 'CONFIRMED',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          }
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
