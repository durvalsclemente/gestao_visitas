import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import type {
  CreateMatriculaDto,
  UpdateMatriculaDto,
} from './dto/matricula.dto';

@Injectable()
export class HistoricoAssistidoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carrega a visão 360° de um assistido. TUDO filtrado por
   * `organizationId` do JWT — chamada com assistido de outro
   * tenant retorna 404 antes de tocar qualquer relação.
   */
  async loadHistorico(assistidoId: string) {
    const { organizationId } = requireTenant();

    const assistido = await this.prisma.assistido.findFirst({
      where: { id: assistidoId, organizationId, deletedAt: null },
    });
    if (!assistido) throw new NotFoundException('Assistido não encontrado');

    // Tudo filtrado por organizationId redundante (defense in depth).
    const tenantWhere = { organizationId };

    const [
      matriculas,
      solicitacoes,
      visitas,
      planosAcao,
      visitaAnexos,
      solicitacaoAnexos,
    ] = await this.prisma.$transaction([
      this.prisma.matriculaAssistido.findMany({
        where: { ...tenantWhere, assistidoId, deletedAt: null },
        include: {
          programa: { select: { id: true, nome: true, tipo: true, cor: true } },
        },
        orderBy: [{ ativa: 'desc' }, { dataInicio: 'desc' }],
      }),

      this.prisma.solicitacaoVisita.findMany({
        where: { ...tenantWhere, assistidoId, deletedAt: null },
        include: {
          motivoPrincipal: { select: { id: true, nome: true } },
          motivosSecundarios: { select: { id: true, nome: true } },
          prioridade: { select: { id: true, nome: true, nivel: true, cor: true } },
          programa: { select: { id: true, nome: true, tipo: true } },
          triagens: {
            orderBy: { createdAt: 'desc' },
            include: {
              prioridadeReclassificada: { select: { nome: true, nivel: true } },
              setorEncaminhamento: { select: { nome: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.visita.findMany({
        where: { ...tenantWhere, assistidoId, deletedAt: null },
        include: {
          visitador: { select: { id: true, nome: true, perfis: true } },
          visitadorSecundario: { select: { id: true, nome: true, perfis: true } },
          relatorio: {
            select: {
              id: true,
              situacao: true,
              criticidadeFinal: true,
              statusCaso: true,
              finalizadoEm: true,
              recomendacoes: true,
            },
          },
        },
        orderBy: { dataAgendada: 'desc' },
      }),

      this.prisma.planoAcao.findMany({
        where: { ...tenantWhere, assistidoId, deletedAt: null },
        include: {
          acoes: {
            where: { deletedAt: null },
            orderBy: { ordem: 'asc' },
          },
          acompanhamentos: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // Anexos via Visita (filtra apenas visitas do assistido).
      this.prisma.visitaAnexo.findMany({
        where: {
          ...tenantWhere,
          deletedAt: null,
          visita: { assistidoId },
        },
        include: { visita: { select: { id: true, dataAgendada: true } } },
        orderBy: { createdAt: 'desc' },
      }),

      // Anexos via Solicitação (filtra apenas solicitações do assistido).
      this.prisma.solicitacaoVisitaAnexo.findMany({
        where: {
          ...tenantWhere,
          deletedAt: null,
          solicitacao: { assistidoId },
        },
        include: { solicitacao: { select: { id: true, descricaoDetalhada: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      assistido,
      matriculas,
      solicitacoes,
      visitas,
      planosAcao,
      anexos: {
        deVisitas: visitaAnexos,
        deSolicitacoes: solicitacaoAnexos,
      },
    };
  }

  // ---------- Matrícula CRUD ----------

  async listMatriculas(assistidoId: string) {
    const { organizationId } = requireTenant();
    await this.assertAssistidoExists(assistidoId, organizationId);
    return this.prisma.matriculaAssistido.findMany({
      where: { organizationId, assistidoId, deletedAt: null },
      include: { programa: { select: { id: true, nome: true, tipo: true } } },
      orderBy: [{ ativa: 'desc' }, { dataInicio: 'desc' }],
    });
  }

  async createMatricula(dto: CreateMatriculaDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertAssistidoExists(dto.assistidoId, organizationId);
    await this.assertProgramaExists(dto.programaId, organizationId);

    return this.prisma.matriculaAssistido.create({
      data: {
        organizationId,
        assistidoId: dto.assistidoId,
        programaId: dto.programaId,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
        ativa: dto.ativa ?? true,
        observacoes: dto.observacoes,
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
      include: { programa: { select: { id: true, nome: true, tipo: true } } },
    });
  }

  async updateMatricula(id: string, dto: UpdateMatriculaDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertMatriculaExists(id, organizationId);
    if (dto.programaId) await this.assertProgramaExists(dto.programaId, organizationId);

    return this.prisma.matriculaAssistido.update({
      where: { id },
      data: {
        ...(dto.programaId !== undefined ? { programaId: dto.programaId } : {}),
        ...(dto.dataInicio !== undefined
          ? { dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null }
          : {}),
        ...(dto.dataFim !== undefined
          ? { dataFim: dto.dataFim ? new Date(dto.dataFim) : null }
          : {}),
        ...(dto.ativa !== undefined ? { ativa: dto.ativa } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        updatedByExternalUserId: externalUserId,
      },
      include: { programa: { select: { id: true, nome: true, tipo: true } } },
    });
  }

  async removeMatricula(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertMatriculaExists(id, organizationId);
    return this.prisma.matriculaAssistido.update({
      where: { id },
      data: { deletedAt: new Date(), updatedByExternalUserId: externalUserId },
    });
  }

  // ---------- Helpers ----------

  private async assertAssistidoExists(id: string, organizationId: string) {
    const exists = await this.prisma.assistido.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Assistido não encontrado');
  }

  private async assertProgramaExists(id: string, organizationId: string) {
    const exists = await this.prisma.programa.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new BadRequestException('Programa inválido para este tenant');
  }

  private async assertMatriculaExists(id: string, organizationId: string) {
    const exists = await this.prisma.matriculaAssistido.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Matrícula não encontrada');
  }
}
