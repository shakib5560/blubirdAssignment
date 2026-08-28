import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { CatalogAssistantService } from './catalog-assistant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantController],
  providers: [CatalogAssistantService],
})
export class AssistantModule {}
