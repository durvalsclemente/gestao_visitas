import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProvisionWebhookDto } from './dto/provision.dto';
import type { DeprovisionWebhookDto } from './dto/deprovision.dto';
import type { UserSyncWebhookDto } from './dto/user-sync.dto';

export type WebhookOutcome = 'applied' | 'ignored_duplicate';

interface WebhookResult {
  status: WebhookOutcome;
  organizationId: string;
}

const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provision(payload: ProvisionWebhookDto): Promise<WebhookResult> {
    const payloadHash = hashPayload(payload);
    return this.runIdempotent(payload.event, payloadHash, payload.organizationId, async (tx) => {
      await tx.organizationTenant.upsert({
        where: { organizationId: payload.organizationId },
        update: {
          active: true,
          disabledAt: null,
          licenseId: payload.licenseId,
          orgName: payload.orgName ?? undefined,
          cnpj: payload.cnpj ?? undefined,
          appSlug: payload.appSlug ?? undefined,
        },
        create: {
          organizationId: payload.organizationId,
          active: true,
          licenseId: payload.licenseId,
          orgName: payload.orgName,
          cnpj: payload.cnpj,
          appSlug: payload.appSlug,
        },
      });
    });
  }

  async deprovision(payload: DeprovisionWebhookDto): Promise<WebhookResult> {
    const payloadHash = hashPayload(payload);
    return this.runIdempotent(payload.event, payloadHash, payload.organizationId, async (tx) => {
      // Soft-disable: mantém TODOS os dados de domínio.
      await tx.organizationTenant.updateMany({
        where: { organizationId: payload.organizationId, active: true },
        data: {
          active: false,
          disabledAt: new Date(),
          licenseId: payload.licenseId,
        },
      });
    });
  }

  async userSync(payload: UserSyncWebhookDto): Promise<WebhookResult> {
    const payloadHash = hashPayload(payload);
    return this.runIdempotent(payload.event, payloadHash, payload.organizationId, async (tx) => {
      // Pré-condição: tenant precisa existir. Se ainda não foi provisionado,
      // criamos como inativo para receber o sync agora e evitar perda.
      await tx.organizationTenant.upsert({
        where: { organizationId: payload.organizationId },
        update: {},
        create: {
          organizationId: payload.organizationId,
          active: false,
        },
      });

      for (const u of payload.users) {
        await tx.userRef.upsert({
          where: {
            organizationId_externalUserId: {
              organizationId: payload.organizationId,
              externalUserId: u.id,
            },
          },
          update: {
            email: u.email,
            name: u.name ?? undefined,
            lastKnownCentralRole: u.role,
          },
          create: {
            organizationId: payload.organizationId,
            externalUserId: u.id,
            email: u.email,
            name: u.name,
            lastKnownCentralRole: u.role,
          },
        });
      }
    });
  }

  /**
   * Executa a mutação dentro de uma transação que também grava
   * WebhookDelivery (event+payloadHash unique). Se o mesmo payload já
   * foi processado, captura P2002 e responde 'ignored_duplicate' sem
   * reaplicar nada.
   */
  private async runIdempotent(
    event: string,
    payloadHash: string,
    organizationId: string,
    apply: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<WebhookResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.webhookDelivery.create({
          data: {
            event,
            payloadHash,
            organizationId,
            status: 'applied',
          },
        });
        await apply(tx);
      });
      this.logger.log({ event, organizationId, status: 'applied' });
      return { status: 'applied', organizationId };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_UNIQUE_VIOLATION
      ) {
        this.logger.log({ event, organizationId, status: 'ignored_duplicate' });
        return { status: 'ignored_duplicate', organizationId };
      }
      // Falha real: registramos a tentativa para auditoria e relançamos
      // (a Central deve receber 5xx e tentar de novo).
      await this.recordFailure(event, payloadHash, organizationId, err);
      throw err;
    }
  }

  private async recordFailure(
    event: string,
    payloadHash: string,
    organizationId: string,
    err: unknown,
  ): Promise<void> {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          event,
          payloadHash: `${payloadHash}:err:${Date.now()}`,
          organizationId,
          status: 'error',
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
        },
      });
    } catch (logErr) {
      this.logger.error({ msg: 'Falha ao registrar WebhookDelivery de erro', logErr });
    }
  }
}

/**
 * Hash determinístico do payload, usado como chave de idempotência.
 * Ordena chaves recursivamente para que pequenas mudanças de
 * serialização não gerem hashes diferentes.
 */
function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
