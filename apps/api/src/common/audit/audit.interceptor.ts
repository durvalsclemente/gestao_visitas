import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { FastifyRequest } from 'fastify';
import { AuditService } from './audit.service';
import {
  AUDIT_ACTION_KEY,
  AUDIT_ENTITY_KEY,
  AUDIT_SKIP_KEY,
} from './audit-action.decorator';
import { sanitize } from './diff.util';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Audita automaticamente toda mutação HTTP bem-sucedida.
 * Não captura before/after — para diff rico, services chamam
 * AuditService.record() manualmente. O interceptor garante a
 * "trilha" mínima (quem, quando, qual rota) sem esforço.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = ctx.switchToHttp();
    const req = httpCtx.getRequest<FastifyRequest & { user?: unknown }>();
    if (!req) return next.handle();

    if (!MUTATION_METHODS.has(req.method)) return next.handle();

    const skip = this.reflector.getAllAndOverride<boolean>(AUDIT_SKIP_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return next.handle();

    const customAction = this.reflector.getAllAndOverride<string | undefined>(
      AUDIT_ACTION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const customEntity = this.reflector.getAllAndOverride<string | undefined>(
      AUDIT_ENTITY_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const route = (req as unknown as { routerPath?: string }).routerPath ?? req.url ?? '';
          const action = customAction ?? `${req.method} ${route}`;
          const entityId =
            extractEntityIdFromResponse(response) ??
            extractEntityIdFromParams(req.params) ??
            undefined;

          await this.audit.record(
            {
              action,
              entity: customEntity ?? extractEntityFromRoute(route),
              entityId,
              meta: {
                method: req.method,
                route,
                params: sanitize(req.params),
                query: sanitize(req.query),
              },
            },
            {
              ip: (req as unknown as { ip?: string }).ip ?? null,
              userAgent: (req.headers?.['user-agent'] as string | undefined) ?? null,
              requestId: (req as unknown as { id?: string }).id ?? null,
              source: 'http',
            },
          );
        } catch {
          /* swallow — auditoria não deve quebrar a request */
        }
      }),
    );
  }
}

// ---------- Helpers de extração ----------

function extractEntityFromRoute(route: string): string | undefined {
  // Pega o primeiro segmento depois da barra, sem parâmetros (:id).
  const parts = route.split('/').filter(Boolean);
  const first = parts.find((p) => !p.startsWith(':'));
  return first ?? undefined;
}

function extractEntityIdFromParams(
  params: Record<string, unknown> | undefined,
): string | undefined {
  if (!params) return undefined;
  const candidates = ['id', 'visitaId', 'solicitacaoId', 'planoId', 'assistidoId'];
  for (const k of candidates) {
    const v = params[k];
    if (typeof v === 'string') return v;
  }
  return undefined;
}

function extractEntityIdFromResponse(response: unknown): string | undefined {
  if (response && typeof response === 'object' && 'id' in response) {
    const id = (response as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
}
