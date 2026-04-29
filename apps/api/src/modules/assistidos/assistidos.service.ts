import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import {
  paginate,
  type PaginatedResult,
} from '../../common/pagination/pagination.dto';
import type { CreateAssistidoDto } from './dto/create-assistido.dto';
import type { UpdateAssistidoDto } from './dto/update-assistido.dto';
import type { ListAssistidosDto } from './dto/list-assistidos.dto';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class AssistidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListAssistidosDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssistidoWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.cidade ? { cidade: query.cidade } : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { cpf: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assistido.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assistido.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.assistido.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Assistido não encontrado');
    return found;
  }

  async create(dto: CreateAssistidoDto) {
    const { organizationId, externalUserId } = requireTenant();
    try {
      const created = await this.prisma.assistido.create({
        data: {
          ...dto,
          organizationId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
      });
      await this.audit.record({
        action: 'create',
        entity: 'Assistido',
        entityId: created.id,
        after: created,
      });
      return created;
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async update(id: string, dto: UpdateAssistidoDto) {
    const { organizationId, externalUserId } = requireTenant();
    const before = await this.prisma.assistido.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Assistido não encontrado');
    try {
      const updated = await this.prisma.assistido.update({
        where: { id },
        data: {
          ...dto,
          updatedByExternalUserId: externalUserId,
        },
      });
      await this.audit.record({
        action: 'update',
        entity: 'Assistido',
        entityId: updated.id,
        before,
        after: updated,
      });
      return updated;
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async remove(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    const before = await this.prisma.assistido.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Assistido não encontrado');
    const deleted = await this.prisma.assistido.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByExternalUserId: externalUserId,
      },
    });
    await this.audit.record({
      action: 'delete',
      entity: 'Assistido',
      entityId: deleted.id,
      before,
      after: deleted,
    });
    return deleted;
  }

  private async assertExists(id: string, organizationId: string): Promise<void> {
    const exists = await this.prisma.assistido.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Assistido não encontrado');
  }
}

function mapPrismaError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Já existe um assistido com este CPF nesta organização');
  }
  return e as Error;
}
