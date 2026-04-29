import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import {
  paginate,
  type PaginatedResult,
} from '../../common/pagination/pagination.dto';
import type { ListAuditDto } from './dto/list-audit.dto';

@Injectable()
export class AuditReadService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.externalUserId ? { externalUserId: query.externalUserId } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // BigInt id precisa virar string para serializar JSON.
    const safeItems = items.map((i) => ({ ...i, id: i.id.toString() }));
    return paginate(safeItems, total, page, limit);
  }
}
