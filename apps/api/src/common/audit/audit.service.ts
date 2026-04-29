import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantContext } from '../tenant/tenant.context';
import { sanitize, shallowDiff } from './diff.util';

export interface AuditRecordInput {
  /**
   * Ação semântica curta (verbo no infinitivo ou nome de evento).
   * Ex.: "create", "update", "delete", "designar-visita", "finalizar-relatorio".
   */
  action: string;
  /** Nome lógico da entidade afetada (ex.: "Assistido"). */
  entity?: string;
  /** ID do registro afetado, quando aplicável. */
  entityId?: string;
  /** Estado anterior (em update/delete). */
  before?: unknown;
  /** Estado novo (em create/update). */
  after?: unknown;
  /** Metadados extras (route, body resumo, contexto). */
  meta?: Record<string, unknown>;
}

export interface AuditOrigin {
  ip?: string | null;
  userAgent?: string | null;
  /** ID da requisição (correlationId do Pino). */
  requestId?: string | null;
  /** Origem da chamada (ex.: "http", "webhook", "schedule"). */
  source?: string | null;
}

/**
 * Persiste registros de auditoria em `audit_logs`.
 * - organizationId/externalUserId vêm do tenant context (JWT) — sem fallback.
 * - Diff entre before/after é gravado em `meta.changed`.
 * - Falhas de gravação NÃO interrompem a request (log + swallow).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput, origin: AuditOrigin = {}): Promise<void> {
    const tenant = getTenantContext();

    const meta: Record<string, unknown> = {
      ...(input.meta ? sanitize(input.meta) : {}),
      ...(origin.requestId ? { requestId: origin.requestId } : {}),
      ...(origin.source ? { source: origin.source } : {}),
    };

    if (input.before !== undefined) meta.before = sanitize(input.before);
    if (input.after !== undefined) meta.after = sanitize(input.after);
    if (input.before !== undefined && input.after !== undefined) {
      const changed = shallowDiff(input.before, input.after);
      if (changed) meta.changed = sanitize(changed);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: tenant?.organizationId,
          externalUserId: tenant?.externalUserId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          meta: meta as Prisma.InputJsonValue,
          ip: origin.ip ?? undefined,
          userAgent: origin.userAgent ?? undefined,
        },
      });
    } catch (e) {
      // Falha no audit nunca pode derrubar a request.
      this.logger.error({
        msg: 'Falha ao gravar AuditLog',
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
