import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { AppEnv } from '../../config/env.validation';

/**
 * Valida o segredo compartilhado configurado na AppIntegration da Central.
 * Suporta API_KEY (header customizado), BEARER e BASIC.
 */
@Injectable()
export class WebhookAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const type = this.config.get('CENTRAL_WEBHOOK_AUTH_TYPE', { infer: true });
    const expectedHeader = this.config.get('CENTRAL_WEBHOOK_AUTH_HEADER', { infer: true });
    const expectedValue = this.config.get('CENTRAL_WEBHOOK_AUTH_VALUE', { infer: true });

    const headerName =
      type === 'BEARER' || type === 'BASIC' ? 'authorization' : expectedHeader.toLowerCase();
    const received = (req.headers?.[headerName] as string | undefined) ?? '';

    let candidate = received;
    if (type === 'BEARER') {
      const prefix = 'Bearer ';
      if (!received.startsWith(prefix)) throw new UnauthorizedException();
      candidate = received.slice(prefix.length);
    } else if (type === 'BASIC') {
      const prefix = 'Basic ';
      if (!received.startsWith(prefix)) throw new UnauthorizedException();
      candidate = received.slice(prefix.length);
    }

    if (!safeEqual(candidate, expectedValue)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
