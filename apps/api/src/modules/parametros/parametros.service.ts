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
import type { CreateParametroDto } from './dto/parametro.dto';
import type { UpdateParametroDto } from './dto/parametro.dto';
import type { ListParametroDto } from './dto/parametro.dto';

/**
 * Parâmetros do app são chave/valor por OSC. Sem soft-delete:
 * a remoção é dura porque um parâmetro órfão polui a configuração.
 * Auditoria continua via createdBy/updatedBy.
 */
@Injectable()
export class ParametrosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListParametroDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.ParametroAppWhereInput = {
      organizationId,
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.search
        ? {
            OR: [
              { chave: { contains: query.search, mode: 'insensitive' } },
              { descricao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.parametroApp.findMany({
        where,
        orderBy: [{ categoria: 'asc' }, { chave: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.parametroApp.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.parametroApp.findFirst({
      where: { id, organizationId },
    });
    if (!found) throw new NotFoundException('Parâmetro não encontrado');
    return found;
  }

  async findByChave(chave: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.parametroApp.findUnique({
      where: { organizationId_chave: { organizationId, chave } },
    });
    if (!found) throw new NotFoundException('Parâmetro não encontrado');
    return found;
  }

  async create(dto: CreateParametroDto) {
    const { organizationId, externalUserId } = requireTenant();
    try {
      return await this.prisma.parametroApp.create({
        data: {
          chave: dto.chave,
          valor: dto.valor as Prisma.InputJsonValue,
          descricao: dto.descricao,
          categoria: dto.categoria,
          organizationId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async update(id: string, dto: UpdateParametroDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    try {
      return await this.prisma.parametroApp.update({
        where: { id },
        data: {
          ...(dto.chave !== undefined ? { chave: dto.chave } : {}),
          ...(dto.valor !== undefined ? { valor: dto.valor as Prisma.InputJsonValue } : {}),
          ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
          ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
          updatedByExternalUserId: externalUserId,
        },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async remove(id: string) {
    const { organizationId } = requireTenant();
    await this.assertExists(id, organizationId);
    return this.prisma.parametroApp.delete({ where: { id } });
  }

  private async assertExists(id: string, organizationId: string) {
    const exists = await this.prisma.parametroApp.count({
      where: { id, organizationId },
    });
    if (!exists) throw new NotFoundException('Parâmetro não encontrado');
  }
}

function mapPrismaError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Já existe um parâmetro com essa chave');
  }
  return e as Error;
}
