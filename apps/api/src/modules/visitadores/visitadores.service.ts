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
import type { CreateVisitadorDto } from './dto/create-visitador.dto';
import type { UpdateVisitadorDto } from './dto/update-visitador.dto';
import type { ListVisitadoresDto } from './dto/list-visitadores.dto';

@Injectable()
export class VisitadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListVisitadoresDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.VisitadorWhereInput = {
      organizationId,
      deletedAt: null,
      ...(typeof query.ativo === 'boolean' ? { ativo: query.ativo } : {}),
      ...(query.perfil ? { perfis: { has: query.perfil } } : {}),
      ...(query.regiao ? { regioes: { has: query.regiao } } : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.visitador.findMany({
        where,
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.visitador.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.visitador.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Visitador não encontrado');
    return found;
  }

  async create(dto: CreateVisitadorDto) {
    const { organizationId, externalUserId } = requireTenant();
    try {
      return await this.prisma.visitador.create({
        data: {
          ...dto,
          organizationId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async update(id: string, dto: UpdateVisitadorDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    try {
      return await this.prisma.visitador.update({
        where: { id },
        data: {
          ...dto,
          updatedByExternalUserId: externalUserId,
        },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async remove(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    return this.prisma.visitador.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  private async assertExists(id: string, organizationId: string) {
    const exists = await this.prisma.visitador.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Visitador não encontrado');
  }
}

function mapPrismaError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Já existe um visitador com este vínculo de usuário');
  }
  return e as Error;
}
