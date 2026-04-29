import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../tenant/require-tenant';
import { paginate, type PaginatedResult } from '../pagination/pagination.dto';

/**
 * Forma mínima que um delegate Prisma de cadastro auxiliar precisa ter.
 * Tipado como `any` porque os delegates dos modelos divergem em assinatura
 * detalhada — os 4 lookups simples (MotivoVisita, TipoEncaminhamento,
 * Prioridade, Status) compartilham este shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LookupDelegate = any;

interface LookupListQuery {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
}

interface LookupOptions {
  /** Campos varridos pelo `search` (insensitive contains). */
  searchFields: string[];
  /** Critério de ordenação default. */
  orderBy?: Prisma.SortOrder | { [k: string]: Prisma.SortOrder }[];
  /** Mensagem de "não encontrado" para o NotFoundException. */
  entityLabel: string;
  /** Mensagem para conflitos de unique. */
  conflictMessage: string;
  /** Filtros extras montados a partir do query (ex.: categoria). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildExtraWhere?: (query: any) => Record<string, unknown>;
}

@Injectable()
export class LookupCrudHelper {
  constructor(private readonly prisma: PrismaService) {}

  async list<T>(
    delegate: LookupDelegate,
    query: LookupListQuery & Record<string, unknown>,
    opts: LookupOptions,
  ): Promise<PaginatedResult<T>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where = {
      organizationId,
      deletedAt: null,
      ...(typeof query.ativo === 'boolean' ? { ativo: query.ativo } : {}),
      ...(opts.buildExtraWhere ? opts.buildExtraWhere(query) : {}),
      ...(query.search
        ? {
            OR: opts.searchFields.map((f) => ({
              [f]: { contains: query.search, mode: 'insensitive' },
            })),
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      delegate.findMany({
        where,
        orderBy: opts.orderBy ?? [{ ordem: 'asc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      delegate.count({ where }),
    ]);
    return paginate(items as T[], total, page, limit);
  }

  async findOne<T>(delegate: LookupDelegate, id: string, label: string): Promise<T> {
    const { organizationId } = requireTenant();
    const found = await delegate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException(`${label} não encontrado`);
    return found as T;
  }

  async create<T>(
    delegate: LookupDelegate,
    dto: Record<string, unknown>,
    conflictMessage: string,
  ): Promise<T> {
    const { organizationId, externalUserId } = requireTenant();
    try {
      return (await delegate.create({
        data: {
          ...dto,
          organizationId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
      })) as T;
    } catch (e) {
      throw mapPrismaError(e, conflictMessage);
    }
  }

  async update<T>(
    delegate: LookupDelegate,
    id: string,
    dto: Record<string, unknown>,
    label: string,
    conflictMessage: string,
  ): Promise<T> {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(delegate, id, organizationId, label);
    try {
      return (await delegate.update({
        where: { id },
        data: {
          ...dto,
          updatedByExternalUserId: externalUserId,
        },
      })) as T;
    } catch (e) {
      throw mapPrismaError(e, conflictMessage);
    }
  }

  async remove<T>(delegate: LookupDelegate, id: string, label: string): Promise<T> {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(delegate, id, organizationId, label);
    return (await delegate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByExternalUserId: externalUserId,
      },
    })) as T;
  }

  private async assertExists(
    delegate: LookupDelegate,
    id: string,
    organizationId: string,
    label: string,
  ): Promise<void> {
    const exists = await delegate.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException(`${label} não encontrado`);
  }
}

function mapPrismaError(e: unknown, conflictMessage: string): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException(conflictMessage);
  }
  return e as Error;
}
