import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class CatalogAssistantService {
  private readonly logger = new Logger(CatalogAssistantService.name);
  private readonly genAI: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
    });
  }

  async getAssistantResponse(userMessage: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      select: {
        name: true,
        description: true,
        price: true,
        stockQuantity: true,
      },
    });

    const catalogContext = products
      .map(
        (p) =>
          `- ${p.name}: ${p.description}. Price: $${p.price.toString()}. Stock: ${
            p.stockQuantity
          }`
      )
      .join('\n');

    const systemPrompt = `You are a helpful customer support AI for our store.
You MUST answer questions strictly based on the following product catalog. Do NOT make up products, prices, or inventory.
If a user asks about a product not in the catalog, politely inform them that we do not carry it.
If a product is out of stock, mention that.

Catalog:
${catalogContext}
`;

    try {
      this.logger.log('Attempting to use primary provider (Gemini 3.6 Flash)...');
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
        },
      });
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
