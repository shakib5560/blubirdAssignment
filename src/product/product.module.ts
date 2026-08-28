import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AssistantModule } from '../assistant/assistant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AssistantModule, PrismaModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
