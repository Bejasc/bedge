import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Req,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { DraftView } from '@bedge/database';
import { DraftCreateSchema } from '@bedge/types';
import { DraftsService } from './drafts.service.js';
import { RateLimiter } from './rate-limit.js';

export interface ClientRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Behind Cloudflare and Apache every request arrives from localhost, so the real client comes from Cloudflare's header. */
export function clientKey(req: ClientRequest): string {
  const forwarded = req.headers['cf-connecting-ip'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.ip || 'unknown';
}

export function parseDraftBody(body: unknown) {
  const parsed = DraftCreateSchema.safeParse(body);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return { ok: false as const, issues: parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`) };
}

@Controller('api/drafts')
export class DraftsController {
  private readonly limiter = new RateLimiter(30, 60_000);

  // Explicit token: tsx (used by `pnpm dev`) doesn't emit decorator metadata for constructor injection.
  public constructor(@Inject(DraftsService) private readonly drafts: DraftsService) {}

  @Post()
  public async create(@Body() body: unknown, @Req() req: ClientRequest): Promise<DraftView> {
    if (!this.limiter.allow(clientKey(req))) throw new HttpException('Too many drafts — try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    const parsed = parseDraftBody(body);
    if (!parsed.ok) throw new BadRequestException({ message: 'Invalid draft', issues: parsed.issues });
    return this.drafts.create(parsed.data);
  }

  @Get(':code')
  public async get(@Param('code') code: string): Promise<DraftView> {
    const draft = await this.drafts.find(code);
    if (!draft) throw new NotFoundException('No draft with that code — it may have expired.');
    return draft;
  }
}
