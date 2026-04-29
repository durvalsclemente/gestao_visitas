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
import type { CreateEducadorDto } from './dto/create-educador.dto';
import type { UpdateEducadorDto } from './dto/update-educador.dto';
import type { ListEducadoresDto } from './dto/list-educadores.dto';

@Injectable()
export class EducadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListEducadoresDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EducadorWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.cargo ? { cargo: query.cargo } : {}),
      ...(typeof query.ativo === 'boolean' ? { ativo: query.ativo } : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { formacao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.educador.findMany({
        where,
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.educador.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.educador.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Educador não encontrado');
    return found;
  }

  async create(dto: CreateEducadorDto) {
    const { organizationId, externalUserId } = requireTenant();
    try {
      return await this.prisma.educador.create({
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

  async update(id: string, dto: UpdateEducadorDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    try {
      return await this.prisma.educador.update({
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
    return this.prisma.educador.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  private async assertExists(id: string, organizationId: string) {
    const exists = await this.prisma.educador.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Educador não encontrado');
  }
}

function mapPrismaError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Já existe um educador com este vínculo de usuário');
  }
  return e as Error;
}
