import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().min(0),
  stockQuantity: z.number().int().min(0).default(0),
});

export const productArraySchema = z.array(productSchema);
export type ExtractedProduct = z.infer<typeof productSchema>;

@Injectable()
export class LLMExtractionService {
  private readonly logger = new Logger(LLMExtractionService.name);
  private geminiClient: GoogleGenAI;
  private groqClient: Groq;

  constructor(private configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });

    const groqKey = this.configService.get<string>('GROQ_API_KEY') || process.env.GROQ_API_KEY;
    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
    }
  }

  async extractProducts(text: string): Promise<ExtractedProduct[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      this.logger.log('Attempting product extraction with Gemini');
      return await this.extractWithGemini(text);
    } catch (error: any) {
      this.logger.warn(`Gemini extraction failed: ${error.message}. Falling back to Groq Llama 3.3 70B.`);
      if (!this.groqClient) {
        throw new Error('Groq client not configured, cannot fallback.');
      }
      return await this.extractWithGroq(text);
    }
  }

  private async extractWithGemini(text: string): Promise<ExtractedProduct[]> {
    const prompt = `Extract a list of products from the following text/HTML. Return JSON in an array format matching the schema {name, description, price, stockQuantity}. If no products found, return empty array.\n\nText: ${text.substring(0, 50000)}`;
    
    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error('Empty response from Gemini');
    
    const parsed = JSON.parse(resultText);
    const validated = productArraySchema.parse(parsed);
    return validated;
  }

  private async extractWithGroq(text: string): Promise<ExtractedProduct[]> {
    const prompt = `Extract a list of products from the following text/HTML. Return ONLY JSON where the root is an array format where each object has {name: string, description: string, price: number, stockQuantity: number}. Do not include markdown code blocks, just raw JSON. If no products found, return [].\n\nText: ${text.substring(0, 20000)}`;
    
    const response = await this.groqClient.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    let resultText = response.choices[0]?.message?.content;
    if (!resultText) throw new Error('Empty response from Groq');
    
    try {
      const parsed = JSON.parse(resultText);
      let target = parsed;
      if (parsed.products && Array.isArray(parsed.products)) {
        target = parsed.products;
      } else if (!Array.isArray(target) && Array.isArray(Object.values(parsed)[0])) {
         target = Object.values(parsed)[0];
      } else if (!Array.isArray(target)) {
         target = [parsed];
      }
      return productArraySchema.parse(target);
    } catch (err) {
       this.logger.error('Failed to parse or validate Groq output', err);
       throw err;
    }
  }
}
