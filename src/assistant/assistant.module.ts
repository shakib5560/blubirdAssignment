import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { CatalogAssistantService } from './catalog-assistant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PrismaModule, OrderModule],
  controllers: [AssistantController],
  providers: [CatalogAssistantService],
})
export class AssistantModule {}
