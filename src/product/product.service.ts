import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { LLMExtractionService } from '../assistant/llm-extraction.service';
import * as ipaddr from 'ipaddr.js';
import * as dns from 'dns/promises';
import * as cheerio from 'cheerio';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private llmService: LLMExtractionService,
  ) {}

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

  async bulkImport(targetUrl: string) {
    let urlObj: URL;
    try {
      urlObj = new URL(targetUrl);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS protocols are allowed');
    }

    try {
      const addresses = await dns.resolve(urlObj.hostname);
      for (const address of addresses) {
        if (ipaddr.isValid(address)) {
          const addr = ipaddr.parse(address);
          const range = addr.range();
          if (range !== 'unicast') {
            throw new BadRequestException(`SSRF Attempt: IP range ${range} is not allowed`);
          }
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`DNS resolution failed for hostname: ${urlObj.hostname}`);
    }

    let text = '';
    try {
      const response = await fetch(urlObj.toString(), {
        redirect: 'manual', // Prevent SSRF via redirect to internal IP
      });
      
      if (response.status >= 300 && response.status < 400) {
        throw new BadRequestException('Redirects are not allowed for security reasons');
      }
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch content from URL: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      if (contentType.includes('text/html')) {
        const $ = cheerio.load(rawText);
        $('script, style, noscript, iframe, img, svg').remove();
        text = $.text().replace(/\\s+/g, ' ').trim();
      } else {
        text = rawText;
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Error fetching URL content: ${err.message}`);
    }

    let extracted = [];
    try {
      extracted = await this.llmService.extractProducts(text);
    } catch (err: any) {
      throw new BadRequestException(`LLM extraction failed: ${err.message}`);
    }

    if (!extracted || extracted.length === 0) {
      return { inserted: 0, updated: 0, failed: 0, message: 'No products found or extracted' };
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const item of extracted) {
      try {
        const existing = await this.prisma.product.findFirst({
          where: { name: item.name },
        });

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              description: item.description,
              price: item.price,
              stockQuantity: item.stockQuantity,
            },
          });
          updated++;
        } else {
          await this.prisma.product.create({
            data: {
              name: item.name,
              description: item.description,
              price: item.price,
              stockQuantity: item.stockQuantity,
            },
          });
          inserted++;
        }
      } catch (err) {
        this.logger.error(`Failed to ingest product ${item.name}`, err);
        failed++;
      }
    }

    return { inserted, updated, failed, message: 'Bulk import successful' };
  }
}
