import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SolicitacaoVisitaStatus,
  TriagemDecisao,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/pagination/pagination.dto';
import type { DecisaoTriagemDto } from './dto/decisao-triagem.dto';
import type { ListFilaTriagemDto } from './dto/list-triagem.dto';

/**
 * Mapa decisão → próximo status da Solicitação.
 * RECLASSIFICAR_PRIORIDADE não muda status (apenas atualiza a FK
 * `prioridadeId` da Solicitação) — o tratamento é especial.
 */
const DECISAO_NEXT_STATUS: Record<TriagemDecisao, SolicitacaoVisitaStatus | 'KEEP'> = {
  APROVAR_VISITA: 'APROVADA',
  DEVOLVER_COMPLEMENTACAO: 'RASCUNHO',
  REJEITAR: 'REJEITADA',
  RECLASSIFICAR_PRIORIDADE: 'KEEP',
  ENCAMINHAR_OUTRO_SETOR: 'ENCAMINHADA',
};

@Injectable()
export class TriagemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Fila ----------

  async listFila(query: ListFilaTriagemDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.SolicitacaoVisitaWhereInput = {
      organizationId,
      deletedAt: null,
      status: query.status
        ? query.status
        : { in: ['ENVIADA_TRIAGEM', 'EM_TRIAGEM'] },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.solicitacaoVisita.findMany({
        where,
        include: {
          assistido: { select: { id: true, nome: true, cpf: true } },
          motivoPrincipal: { select: { id: true, nome: true } },
          prioridade: { select: { id: true, nome: true, nivel: true, cor: true } },
        },
        orderBy: [
          { prioridade: { nivel: 'desc' } },
          { riscoImediato: 'desc' },
          { enviadaTriagemEm: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitacaoVisita.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async listHistorico(solicitacaoId: string) {
    const { organizationId } = requireTenant();
    await this.assertSolicitacaoInTenant(solicitacaoId, organizationId);
    return this.prisma.triagem.findMany({
      where: { organizationId, solicitacaoId },
      orderBy: { createdAt: 'desc' },
      include: {
        prioridadeReclassificada: { select: { id: true, nome: true, nivel: true } },
        setorEncaminhamento: { select: { id: true, nome: true } },
      },
    });
  }

  // ---------- Transições ----------

  async assumir(solicitacaoId: string) {
    const { organizationId, externalUserId } = requireTenant();
    const sol = await this.loadSolicitacao(solicitacaoId, organizationId);

    if (sol.status === 'EM_TRIAGEM') {
      // Idempotente se for o mesmo triador.
      if (sol.triadorExternalUserId === externalUserId) return sol;
      throw new ConflictException(
        `Solicitação já está sob triagem de outro técnico (externalUserId=${sol.triadorExternalUserId}).`,
      );
    }
    if (sol.status !== 'ENVIADA_TRIAGEM') {
      throw new ConflictException(
        `Solicitação está com status "${sol.status}" e não pode ser assumida para triagem.`,
      );
    }

    return this.prisma.solicitacaoVisita.update({
      where: { id: sol.id },
      data: {
        status: 'EM_TRIAGEM',
        triadorExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async decidir(solicitacaoId: string, dto: DecisaoTriagemDto) {
    const { organizationId, externalUserId } = requireTenant();
    const sol = await this.loadSolicitacao(solicitacaoId, organizationId);

    if (sol.status !== 'EM_TRIAGEM') {
      throw new ConflictException(
        `Apenas solicitações EM_TRIAGEM podem receber decisão (status atual: ${sol.status}). Use "assumir" antes.`,
      );
    }
    if (sol.triadorExternalUserId && sol.triadorExternalUserId !== externalUserId) {
      throw new ConflictException(
        'Somente o triador que assumiu a solicitação pode registrar a decisão.',
      );
    }

    this.assertConditionalRefs(dto);
    await this.assertReferenceTenants(dto, organizationId);

    const target = DECISAO_NEXT_STATUS[dto.decisao];
    const statusNovo: SolicitacaoVisitaStatus = target === 'KEEP' ? sol.status : target;

    // Tudo numa transação: cria Triagem + atualiza Solicitação.
    const [triagem] = await this.prisma.$transaction([
      this.prisma.triagem.create({
        data: {
          organizationId,
          solicitacaoId: sol.id,
          triadorExternalUserId: externalUserId,
          complexidade: dto.complexidade,
          tipoAtendimentoIndicado: dto.tipoAtendimentoIndicado,
          necessidadeDuplaVisita: dto.necessidadeDuplaVisita ?? false,
          necessidadePsicologo: dto.necessidadePsicologo ?? false,
          necessidadeAssistenteSocial: dto.necessidadeAssistenteSocial ?? false,
          dataLimiteRecomendada: dto.dataLimiteRecomendada
            ? new Date(dto.dataLimiteRecomendada)
            : undefined,
          justificativaTecnica: dto.justificativaTecnica,
          decisao: dto.decisao,
          prioridadeReclassificadaId: dto.prioridadeReclassificadaId,
          setorEncaminhamentoId: dto.setorEncaminhamentoId,
          statusAnterior: sol.status,
          statusNovo,
          createdByExternalUserId: externalUserId,
        },
      }),
      this.prisma.solicitacaoVisita.update({
        where: { id: sol.id },
        data: {
          status: statusNovo,
          triadaEm: new Date(),
          updatedByExternalUserId: externalUserId,
          // Devolução para complementação libera o triador (volta a rascunho).
          ...(dto.decisao === 'DEVOLVER_COMPLEMENTACAO'
            ? {
                triadorExternalUserId: null,
                enviadaTriagemEm: null,
              }
            : {}),
          // Reclassificação atualiza diretamente a prioridade da Solicitação.
          ...(dto.decisao === 'RECLASSIFICAR_PRIORIDADE'
            ? { prioridadeId: dto.prioridadeReclassificadaId! }
            : {}),
        },
      }),
    ]);

    await this.audit.record({
      action: 'triagem.decidir',
      entity: 'SolicitacaoVisita',
      entityId: sol.id,
      meta: {
        decisao: dto.decisao,
        complexidade: dto.complexidade,
        statusAnterior: sol.status,
        statusNovo,
        prioridadeReclassificadaId: dto.prioridadeReclassificadaId,
        setorEncaminhamentoId: dto.setorEncaminhamentoId,
      },
    });

    return {
      triagem,
      statusAnterior: sol.status,
      statusNovo,
    };
  }

  // ---------- Helpers ----------

  private async loadSolicitacao(id: string, organizationId: string) {
    const sol = await this.prisma.solicitacaoVisita.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!sol) throw new NotFoundException('Solicitação não encontrada');
    return sol;
  }

  private async assertSolicitacaoInTenant(id: string, organizationId: string): Promise<void> {
    const exists = await this.prisma.solicitacaoVisita.count({
      where: { id, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Solicitação não encontrada');
  }

  private assertConditionalRefs(dto: DecisaoTriagemDto): void {
    if (dto.decisao === 'RECLASSIFICAR_PRIORIDADE' && !dto.prioridadeReclassificadaId) {
      throw new BadRequestException(
        'Decisão RECLASSIFICAR_PRIORIDADE exige prioridadeReclassificadaId',
      );
    }
    if (dto.decisao === 'ENCAMINHAR_OUTRO_SETOR' && !dto.setorEncaminhamentoId) {
      throw new BadRequestException(
        'Decisão ENCAMINHAR_OUTRO_SETOR exige setorEncaminhamentoId',
      );
    }
    // Defesa contra payload com campos a mais que não pertencem à decisão
    // escolhida — silencioso, mas evita gravar referências espúrias.
    if (dto.decisao !== 'RECLASSIFICAR_PRIORIDADE') {
      dto.prioridadeReclassificadaId = undefined;
    }
    if (dto.decisao !== 'ENCAMINHAR_OUTRO_SETOR') {
      dto.setorEncaminhamentoId = undefined;
    }
  }

  private async assertReferenceTenants(
    dto: DecisaoTriagemDto,
    organizationId: string,
  ): Promise<void> {
    if (dto.prioridadeReclassificadaId) {
      const exists = await this.prisma.prioridade.count({
        where: {
          id: dto.prioridadeReclassificadaId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!exists) throw new BadRequestException('Prioridade inválida para este tenant');
    }
    if (dto.setorEncaminhamentoId) {
      const exists = await this.prisma.tipoEncaminhamento.count({
        where: {
          id: dto.setorEncaminhamentoId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!exists) {
        throw new BadRequestException('Setor de encaminhamento inválido para este tenant');
      }
    }
  }
}
