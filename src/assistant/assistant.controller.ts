import { Controller, Post, Body } from '@nestjs/common';
import { CatalogAssistantService } from './catalog-assistant.service';
import { ChatDto } from './dto/chat.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly catalogAssistantService: CatalogAssistantService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto) {
    const response = await this.catalogAssistantService.getAssistantResponse(chatDto.message);
    return { response };
  }
}
