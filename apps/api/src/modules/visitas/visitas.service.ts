import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/pagination/pagination.dto';
import type { DesignarVisitaDto } from './dto/designar-visita.dto';
import type { ReagendarVisitaDto } from './dto/reagendar-visita.dto';
import type { CancelarVisitaDto } from './dto/cancelar-visita.dto';
import type { RealizarVisitaDto } from './dto/realizar-visita.dto';
import type { AgendaQueryDto } from './dto/agenda-query.dto';

const INCLUDE = {
  assistido: { select: { id: true, nome: true, cpf: true } },
  visitador: {
    select: { id: true, nome: true, perfis: true, regioes: true, ativo: true },
  },
  visitadorSecundario: {
    select: { id: true, nome: true, perfis: true, regioes: true, ativo: true },
  },
} satisfies Prisma.VisitaInclude;

@Injectable()
export class VisitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Leitura ----------

  async agenda(query: AgendaQueryDto): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.VisitaWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assistidoId ? { assistidoId: query.assistidoId } : {}),
      ...(query.visitadorId
        ? {
            OR: [
              { visitadorId: query.visitadorId },
              { visitadorSecundarioId: query.visitadorId },
            ],
          }
        : {}),
      ...(query.de || query.ate
        ? {
            dataAgendada: {
              ...(query.de ? { gte: new Date(query.de) } : {}),
              ...(query.ate ? { lt: new Date(query.ate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.visita.findMany({
        where,
        include: INCLUDE,
        orderBy: { dataAgendada: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.visita.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.visita.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: INCLUDE,
    });
    if (!found) throw new NotFoundException('Visita não encontrada');
    return found;
  }

  // ---------- Designação a partir de solicitação aprovada ----------

  async designar(dto: DesignarVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();

    if (dto.visitadorSecundarioId && dto.visitadorSecundarioId === dto.visitadorId) {
      throw new BadRequestException('Visitador secundário não pode ser o mesmo que o primário');
    }

    const sol = await this.prisma.solicitacaoVisita.findFirst({
      where: { id: dto.solicitacaoId, organizationId, deletedAt: null },
      select: { id: true, assistidoId: true, status: true, visitaId: true },
    });
    if (!sol) throw new NotFoundException('Solicitação não encontrada');
    if (sol.status !== 'APROVADA') {
      throw new ConflictException(
        `Só é possível designar visita para solicitação APROVADA. Status atual: ${sol.status}.`,
      );
    }
    if (sol.visitaId) {
      throw new ConflictException('Esta solicitação já gerou uma visita');
    }

    const dataAgendada = new Date(dto.dataAgendada);

    await this.assertVisitadorAtivo(dto.visitadorId, organizationId, 'primário');
    if (dto.visitadorSecundarioId) {
      await this.assertVisitadorAtivo(dto.visitadorSecundarioId, organizationId, 'secundário');
    }

    await this.assertSemConflito(
      organizationId,
      dto.visitadorId,
      dataAgendada,
      dto.duracaoMinutos ?? null,
    );
    if (dto.visitadorSecundarioId) {
      await this.assertSemConflito(
        organizationId,
        dto.visitadorSecundarioId,
        dataAgendada,
        dto.duracaoMinutos ?? null,
      );
    }

    // Tudo numa transação: cria Visita + atualiza Solicitação para
    // CONVERTIDA_VISITA com visitaId apontando para a nova.
    const [visita] = await this.prisma.$transaction(async (tx) => {
      const novaVisita = await tx.visita.create({
        data: {
          organizationId,
          assistidoId: sol.assistidoId,
          visitadorId: dto.visitadorId,
          visitadorSecundarioId: dto.visitadorSecundarioId,
          tipo: dto.tipo,
          dataAgendada,
          duracaoMinutos: dto.duracaoMinutos,
          endereco: dto.endereco,
          observacoes: dto.observacoes,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
        include: INCLUDE,
      });

      await tx.solicitacaoVisita.update({
        where: { id: sol.id },
        data: {
          status: 'CONVERTIDA_VISITA',
          visitaId: novaVisita.id,
          updatedByExternalUserId: externalUserId,
        },
      });

      return [novaVisita];
    });

    await this.audit.record({
      action: 'visita.designar',
      entity: 'Visita',
      entityId: visita.id,
      after: visita,
      meta: {
        solicitacaoId: dto.solicitacaoId,
        visitadorId: dto.visitadorId,
        visitadorSecundarioId: dto.visitadorSecundarioId,
        dataAgendada: dto.dataAgendada,
      },
    });

    return visita;
  }

  // ---------- Transições ----------

  async reagendar(id: string, dto: ReagendarVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const v = await this.loadEditable(id, organizationId);

    const novaData = new Date(dto.novaDataAgendada);
    await this.assertSemConflito(organizationId, v.visitadorId, novaData, v.duracaoMinutos, v.id);
    if (v.visitadorSecundarioId) {
      await this.assertSemConflito(
        organizationId,
        v.visitadorSecundarioId,
        novaData,
        v.duracaoMinutos,
        v.id,
      );
    }

    return this.prisma.visita.update({
      where: { id: v.id },
      data: {
        dataAgendada: novaData,
        motivoReagendamento: dto.motivoReagendamento,
        reagendamentoCount: { increment: 1 },
        // Visita reagendada volta a precisar de confirmação.
        confirmadaEm: null,
        confirmadaPorExternalUserId: null,
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });
  }

  async cancelar(id: string, dto: CancelarVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const v = await this.loadEditable(id, organizationId);

    const updated = await this.prisma.visita.update({
      where: { id: v.id },
      data: {
        status: 'CANCELADA',
        motivoCancelamento: dto.motivoCancelamento,
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });

    await this.audit.record({
      action: 'visita.cancelar',
      entity: 'Visita',
      entityId: v.id,
      before: { status: v.status },
      after: { status: 'CANCELADA' },
      meta: { motivoCancelamento: dto.motivoCancelamento },
    });

    return updated;
  }

  async confirmar(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    const v = await this.loadEditable(id, organizationId);
    if (v.confirmadaEm) {
      // Idempotente.
      return this.findOne(v.id);
    }
    return this.prisma.visita.update({
      where: { id: v.id },
      data: {
        confirmadaEm: new Date(),
        confirmadaPorExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });
  }

  async realizar(id: string, dto: RealizarVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const v = await this.loadEditable(id, organizationId);

    return this.prisma.visita.update({
      where: { id: v.id },
      data: {
        status: 'REALIZADA',
        dataRealizada: dto.dataRealizada ? new Date(dto.dataRealizada) : new Date(),
        resultado: dto.resultado,
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });
  }

  // ---------- Helpers ----------

  private async loadEditable(id: string, organizationId: string) {
    const v = await this.prisma.visita.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!v) throw new NotFoundException('Visita não encontrada');
    if (v.status === 'CANCELADA' || v.status === 'REALIZADA') {
      throw new ConflictException(
        `Visita está com status "${v.status}" e não aceita mais transições.`,
      );
    }
    return v;
  }

  private async assertVisitadorAtivo(
    visitadorId: string,
    organizationId: string,
    rotulo: string,
  ): Promise<void> {
    const v = await this.prisma.visitador.findFirst({
      where: { id: visitadorId, organizationId, deletedAt: null },
      select: { ativo: true },
    });
    if (!v) {
      throw new BadRequestException(`Visitador ${rotulo} inválido para este tenant`);
    }
    if (!v.ativo) {
      throw new BadRequestException(`Visitador ${rotulo} está inativo`);
    }
  }

  /**
   * Bloqueia overlap de horários para o mesmo visitador.
   * Considera duração: se uma visita tem duração 60min, conflita com
   * qualquer outra que comece dentro dessa janela.
   *
   * `excludeVisitaId` é usado em reagendamento (a própria visita não
   * pode conflitar com ela mesma).
   */
  private async assertSemConflito(
    organizationId: string,
    visitadorId: string,
    inicio: Date,
    duracaoMin: number | null,
    excludeVisitaId?: string,
  ): Promise<void> {
    // Janela da nova visita.
    const novaInicio = inicio;
    const novaFim = new Date(inicio.getTime() + (duracaoMin ?? 60) * 60_000);

    // Buscar visitas do mesmo visitador (primário OU secundário) que estejam
    // ativas (não canceladas) e cuja janela toque a janela nova.
    const candidatas = await this.prisma.visita.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: ['CANCELADA', 'REALIZADA'] },
        OR: [{ visitadorId }, { visitadorSecundarioId: visitadorId }],
        ...(excludeVisitaId ? { NOT: { id: excludeVisitaId } } : {}),
        // Filtro grosso: dataAgendada dentro de uma janela de 24h em volta.
        dataAgendada: {
          gte: new Date(novaInicio.getTime() - 24 * 3600 * 1000),
          lt: new Date(novaFim.getTime() + 24 * 3600 * 1000),
        },
      },
      select: { id: true, dataAgendada: true, duracaoMinutos: true },
    });

    for (const c of candidatas) {
      const cInicio = c.dataAgendada;
      const cFim = new Date(cInicio.getTime() + (c.duracaoMinutos ?? 60) * 60_000);
      const overlap = novaInicio < cFim && cInicio < novaFim;
      if (overlap) {
        throw new ConflictException(
          `Conflito de agenda: visitador já possui visita em ${cInicio.toISOString()}.`,
        );
      }
    }
  }
}
