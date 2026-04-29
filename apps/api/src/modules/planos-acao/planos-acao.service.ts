import {
  BadRequestException,
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
import type {
  CreatePlanoAcaoDto,
  ListPlanosAcaoDto,
  UpdatePlanoAcaoDto,
} from './dto/plano.dto';
import type { CreateAcaoDto, UpdateAcaoDto } from './dto/acao.dto';
import type { RegistrarAcompanhamentoDto } from './dto/acompanhamento.dto';

const INCLUDE_BASIC = {
  assistido: { select: { id: true, nome: true, cpf: true } },
} satisfies Prisma.PlanoAcaoInclude;

const INCLUDE_FULL = {
  assistido: { select: { id: true, nome: true, cpf: true } },
  visita: {
    select: { id: true, dataAgendada: true, status: true },
  },
  solicitacao: {
    select: { id: true, descricaoDetalhada: true },
  },
  acoes: {
    where: { deletedAt: null },
    orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
  },
  acompanhamentos: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.PlanoAcaoInclude;

@Injectable()
export class PlanosAcaoService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Plano ----------

  async list(query: ListPlanosAcaoDto): Promise<PaginatedResult<unknown>> {
    const { organizationId, externalUserId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PlanoAcaoWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assistidoId ? { assistidoId: query.assistidoId } : {}),
      ...(query.apenasMeus
        ? { responsaveisExternalUserIds: { has: externalUserId } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { objetivo: { contains: query.search, mode: 'insensitive' } },
              { problemaPrincipal: { contains: query.search, mode: 'insensitive' } },
              { assistido: { nome: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.planoAcao.findMany({
        where,
        include: INCLUDE_BASIC,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.planoAcao.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.planoAcao.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: INCLUDE_FULL,
    });
    if (!found) throw new NotFoundException('Plano de ação não encontrado');
    return found;
  }

  async create(dto: CreatePlanoAcaoDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertReferences(dto, organizationId);

    return this.prisma.planoAcao.create({
      data: {
        organizationId,
        assistidoId: dto.assistidoId,
        visitaId: dto.visitaId,
        solicitacaoId: dto.solicitacaoId,
        objetivo: dto.objetivo,
        problemaPrincipal: dto.problemaPrincipal,
        areaResponsavel: dto.areaResponsavel,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        indicadorSucesso: dto.indicadorSucesso,
        status: dto.status ?? 'RASCUNHO',
        dataRevisao: dto.dataRevisao ? new Date(dto.dataRevisao) : undefined,
        responsaveisExternalUserIds: dto.responsaveisExternalUserIds ?? [],
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE_FULL,
    });
  }

  async update(id: string, dto: UpdatePlanoAcaoDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    await this.assertReferences(dto, organizationId);

    return this.prisma.planoAcao.update({
      where: { id },
      data: {
        ...(dto.assistidoId !== undefined ? { assistidoId: dto.assistidoId } : {}),
        ...(dto.visitaId !== undefined ? { visitaId: dto.visitaId || null } : {}),
        ...(dto.solicitacaoId !== undefined
          ? { solicitacaoId: dto.solicitacaoId || null }
          : {}),
        ...(dto.objetivo !== undefined ? { objetivo: dto.objetivo } : {}),
        ...(dto.problemaPrincipal !== undefined
          ? { problemaPrincipal: dto.problemaPrincipal }
          : {}),
        ...(dto.areaResponsavel !== undefined
          ? { areaResponsavel: dto.areaResponsavel }
          : {}),
        ...(dto.prazo !== undefined ? { prazo: dto.prazo ? new Date(dto.prazo) : null } : {}),
        ...(dto.indicadorSucesso !== undefined
          ? { indicadorSucesso: dto.indicadorSucesso }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dataRevisao !== undefined
          ? { dataRevisao: dto.dataRevisao ? new Date(dto.dataRevisao) : null }
          : {}),
        ...(dto.responsaveisExternalUserIds !== undefined
          ? { responsaveisExternalUserIds: dto.responsaveisExternalUserIds }
          : {}),
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE_FULL,
    });
  }

  async remove(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId);
    return this.prisma.planoAcao.update({
      where: { id },
      data: { deletedAt: new Date(), updatedByExternalUserId: externalUserId },
    });
  }

  // ---------- Ações ----------

  async addAcao(planoId: string, dto: CreateAcaoDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(planoId, organizationId);

    // Próxima ordem.
    const last = await this.prisma.acaoPlano.findFirst({
      where: { organizationId, planoId, deletedAt: null },
      orderBy: { ordem: 'desc' },
      select: { ordem: true },
    });
    const ordem = dto.ordem ?? (last?.ordem ?? -1) + 1;

    return this.prisma.acaoPlano.create({
      data: {
        organizationId,
        planoId,
        descricao: dto.descricao,
        responsavelExternalUserId: dto.responsavelExternalUserId,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        ordem,
        concluida: dto.concluida ?? false,
        concluidaEm: dto.concluida ? new Date() : undefined,
        observacoes: dto.observacoes,
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async updateAcao(planoId: string, acaoId: string, dto: UpdateAcaoDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertAcaoExists(acaoId, planoId, organizationId);

    return this.prisma.acaoPlano.update({
      where: { id: acaoId },
      data: {
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.responsavelExternalUserId !== undefined
          ? { responsavelExternalUserId: dto.responsavelExternalUserId || null }
          : {}),
        ...(dto.prazo !== undefined
          ? { prazo: dto.prazo ? new Date(dto.prazo) : null }
          : {}),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
        ...(dto.concluida !== undefined
          ? {
              concluida: dto.concluida,
              concluidaEm: dto.concluida ? new Date() : null,
            }
          : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async removeAcao(planoId: string, acaoId: string) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertAcaoExists(acaoId, planoId, organizationId);
    return this.prisma.acaoPlano.update({
      where: { id: acaoId },
      data: { deletedAt: new Date(), updatedByExternalUserId: externalUserId },
    });
  }

  // ---------- Acompanhamentos ----------

  async registrarAcompanhamento(planoId: string, dto: RegistrarAcompanhamentoDto) {
    const { organizationId, externalUserId } = requireTenant();
    const plano = await this.prisma.planoAcao.findFirst({
      where: { id: planoId, organizationId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!plano) throw new NotFoundException('Plano de ação não encontrado');
    if (plano.status === 'CANCELADO') {
      throw new BadRequestException('Plano cancelado não aceita novos acompanhamentos');
    }

    const [acomp] = await this.prisma.$transaction(async (tx) => {
      const novo = await tx.acompanhamentoPlano.create({
        data: {
          organizationId,
          planoId,
          evolucao: dto.evolucao,
          dificuldades: dto.dificuldades,
          proximosPassos: dto.proximosPassos,
          necessitaNovaVisita: dto.necessitaNovaVisita ?? false,
          encerraCaso: dto.encerraCaso ?? false,
          createdByExternalUserId: externalUserId,
        },
      });

      // Se o acompanhamento encerra o caso, fechamos o plano automaticamente.
      if (dto.encerraCaso) {
        await tx.planoAcao.update({
          where: { id: planoId },
          data: {
            status: 'CONCLUIDO',
            updatedByExternalUserId: externalUserId,
          },
        });
      }
      return [novo];
    });

    return acomp;
  }

  async listAcompanhamentos(planoId: string) {
    const { organizationId } = requireTenant();
    await this.assertExists(planoId, organizationId);
    return this.prisma.acompanhamentoPlano.findMany({
      where: { organizationId, planoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- Helpers ----------

  private async assertExists(id: string, organizationId: string) {
    const exists = await this.prisma.planoAcao.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Plano de ação não encontrado');
  }

  private async assertAcaoExists(
    acaoId: string,
    planoId: string,
    organizationId: string,
  ) {
    const exists = await this.prisma.acaoPlano.count({
      where: { id: acaoId, planoId, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Ação não encontrada');
  }

  /**
   * Garante que assistidoId / visitaId / solicitacaoId pertencem ao mesmo
   * tenant — evita um payload malicioso vincular plano a recursos de outra OSC.
   */
  private async assertReferences(
    dto: Partial<CreatePlanoAcaoDto>,
    organizationId: string,
  ): Promise<void> {
    const checks: Promise<void>[] = [];
    if (dto.assistidoId) {
      checks.push(
        this.prisma.assistido
          .count({
            where: { id: dto.assistidoId, organizationId, deletedAt: null },
          })
          .then((n) => {
            if (!n) throw new BadRequestException('Assistido inválido para este tenant');
          }),
      );
    }
    if (dto.visitaId) {
      checks.push(
        this.prisma.visita
          .count({
            where: { id: dto.visitaId, organizationId, deletedAt: null },
          })
          .then((n) => {
            if (!n) throw new BadRequestException('Visita inválida para este tenant');
          }),
      );
    }
    if (dto.solicitacaoId) {
      checks.push(
        this.prisma.solicitacaoVisita
          .count({
            where: { id: dto.solicitacaoId, organizationId, deletedAt: null },
          })
          .then((n) => {
            if (!n) {
              throw new BadRequestException('Solicitação inválida para este tenant');
            }
          }),
      );
    }
    await Promise.all(checks);
  }
}
