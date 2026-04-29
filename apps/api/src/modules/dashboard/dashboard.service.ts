import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import type { DashboardQueryDto } from './dto/dashboard.dto';

interface BucketByMonth {
  mes: string; // YYYY-MM
  total: number;
}

interface BucketByLabel {
  label: string;
  total: number;
}

interface VisitadorBucket {
  visitadorId: string;
  visitador: string;
  total: number;
  realizadas: number;
  naoRealizadas: number;
  canceladas: number;
}

interface Reincidente {
  assistidoId: string;
  assistido: string;
  total: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(query: DashboardQueryDto) {
    const { organizationId } = requireTenant();
    const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
    const from = query.from
      ? startOfDay(new Date(query.from))
      : startOfDay(new Date(to.getTime() - 180 * 24 * 3600 * 1000));

    const [
      solicitacoesNoPeriodo,
      visitasRealizadas,
      visitasAgendadasPeriodo,
      relatoriosFinalizados,
      casosAbertos,
      casosEncerrados,
      encaminhamentos,
      solicitacoesPorMes,
      solicitacoesPorMotivo,
      solicitacoesPorPrograma,
      criticidadesRelatorios,
      visitasPorVisitador,
      casosPorStatus,
      reincidentes,
      tempoMedioRow,
      visitasPrazoStats,
    ] = await Promise.all([
      this.countSolicitacoes(organizationId, from, to),
      this.countVisitas(organizationId, from, to, 'REALIZADA'),
      this.countVisitas(organizationId, from, to, undefined),
      this.countRelatoriosFinalizados(organizationId, from, to),
      this.countPlanosByStatusGroup(organizationId, ['ATIVO', 'EM_REVISAO', 'RASCUNHO']),
      this.countPlanosEncerradosNoPeriodo(organizationId, from, to),
      this.countEncaminhamentos(organizationId, from, to),

      this.solicitacoesPorMes(organizationId, from, to),
      this.solicitacoesPorMotivo(organizationId, from, to),
      this.solicitacoesPorPrograma(organizationId, from, to),
      this.criticidadesRelatorios(organizationId, from, to),
      this.visitasPorVisitador(organizationId, from, to),
      this.casosPorStatus(organizationId),
      this.reincidentesTopo(organizationId, from, to, 10),
      this.tempoMedioSolicitacaoVisita(organizationId, from, to),
      this.visitasNoPrazo(organizationId, from, to),
    ]);

    return {
      periodo: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        solicitacoesNoPeriodo,
        visitasRealizadas,
        visitasAgendadas: visitasAgendadasPeriodo,
        relatoriosFinalizados,
        casosAbertos,
        casosEncerrados,
        encaminhamentos,
        reincidencias: reincidentes.length,
        tempoMedioSolicitacaoVisitaDias: tempoMedioRow,
        visitasNoPrazo: visitasPrazoStats.noPrazo,
        visitasForaDoPrazo: visitasPrazoStats.foraDoPrazo,
      },
      solicitacoesPorPeriodo: solicitacoesPorMes,
      solicitacoesPorMotivo,
      solicitacoesPorPrograma,
      visitasPorCriticidade: criticidadesRelatorios,
      visitasPorVisitador,
      casosPorStatus,
      reincidentesTopo: reincidentes,
    };
  }

  // ---------- Counts simples ----------

  private async countSolicitacoes(orgId: string, from: Date, to: Date) {
    return this.prisma.solicitacaoVisita.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
    });
  }

  private async countVisitas(
    orgId: string,
    from: Date,
    to: Date,
    status?: 'REALIZADA' | 'AGENDADA' | 'CANCELADA' | 'NAO_REALIZADA',
  ) {
    return this.prisma.visita.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        dataAgendada: { gte: from, lte: to },
        ...(status ? { status } : {}),
      },
    });
  }

  private async countRelatoriosFinalizados(orgId: string, from: Date, to: Date) {
    return this.prisma.relatorioVisita.count({
      where: {
        organizationId: orgId,
        finalizadoEm: { gte: from, lte: to },
      },
    });
  }

  private async countPlanosByStatusGroup(orgId: string, status: string[]) {
    return this.prisma.planoAcao.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { in: status as Prisma.PlanoAcaoStatus[] | undefined as never },
      },
    });
  }

  private async countPlanosEncerradosNoPeriodo(orgId: string, from: Date, to: Date) {
    return this.prisma.planoAcao.count({
      where: {
        organizationId: orgId,
        status: 'CONCLUIDO',
        updatedAt: { gte: from, lte: to },
      },
    });
  }

  private async countEncaminhamentos(orgId: string, from: Date, to: Date) {
    return this.prisma.triagem.count({
      where: {
        organizationId: orgId,
        decisao: 'ENCAMINHAR_OUTRO_SETOR',
        createdAt: { gte: from, lte: to },
      },
    });
  }

  // ---------- Séries / agrupamentos ----------

  private async solicitacoesPorMes(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<BucketByMonth[]> {
    const rows = await this.prisma.$queryRaw<Array<{ mes: Date; total: bigint }>>`
      SELECT date_trunc('month', "createdAt") AS mes, COUNT(*)::bigint AS total
      FROM solicitacoes_visita
      WHERE "organizationId" = ${orgId}
        AND "deletedAt" IS NULL
        AND "createdAt" BETWEEN ${from} AND ${to}
      GROUP BY date_trunc('month', "createdAt")
      ORDER BY mes ASC
    `;
    return rows.map((r) => ({
      mes: r.mes.toISOString().slice(0, 7),
      total: Number(r.total),
    }));
  }

  private async solicitacoesPorMotivo(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<BucketByLabel[]> {
    const rows = await this.prisma.$queryRaw<Array<{ nome: string | null; total: bigint }>>`
      SELECT m.nome, COUNT(s.id)::bigint AS total
      FROM solicitacoes_visita s
      LEFT JOIN motivos_visita m ON s."motivoPrincipalId" = m.id
      WHERE s."organizationId" = ${orgId}
        AND s."deletedAt" IS NULL
        AND s."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY m.nome
      ORDER BY total DESC
    `;
    return rows.map((r) => ({ label: r.nome ?? '(sem motivo)', total: Number(r.total) }));
  }

  private async solicitacoesPorPrograma(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<BucketByLabel[]> {
    const rows = await this.prisma.$queryRaw<Array<{ nome: string | null; total: bigint }>>`
      SELECT p.nome, COUNT(s.id)::bigint AS total
      FROM solicitacoes_visita s
      LEFT JOIN programas p ON s."programaId" = p.id
      WHERE s."organizationId" = ${orgId}
        AND s."deletedAt" IS NULL
        AND s."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY p.nome
      ORDER BY total DESC
    `;
    return rows.map((r) => ({ label: r.nome ?? '(sem programa)', total: Number(r.total) }));
  }

  private async criticidadesRelatorios(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<BucketByLabel[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ criticidade: string | null; total: bigint }>
    >`
      SELECT "criticidadeFinal" AS criticidade, COUNT(*)::bigint AS total
      FROM relatorios_visita
      WHERE "organizationId" = ${orgId}
        AND "finalizadoEm" BETWEEN ${from} AND ${to}
      GROUP BY "criticidadeFinal"
      ORDER BY
        CASE "criticidadeFinal"
          WHEN 'MUITO_ALTA' THEN 1
          WHEN 'ALTA' THEN 2
          WHEN 'MEDIA' THEN 3
          WHEN 'BAIXA' THEN 4
          ELSE 5
        END
    `;
    return rows.map((r) => ({
      label: r.criticidade ?? '(não classificada)',
      total: Number(r.total),
    }));
  }

  private async visitasPorVisitador(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<VisitadorBucket[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        visitadorId: string;
        visitador: string;
        total: bigint;
        realizadas: bigint;
        nao_realizadas: bigint;
        canceladas: bigint;
      }>
    >`
      SELECT
        v."visitadorId" AS "visitadorId",
        vis.nome AS visitador,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE v.status = 'REALIZADA')::bigint AS realizadas,
        COUNT(*) FILTER (WHERE v.status = 'NAO_REALIZADA')::bigint AS nao_realizadas,
        COUNT(*) FILTER (WHERE v.status = 'CANCELADA')::bigint AS canceladas
      FROM visitas v
      JOIN visitadores vis ON v."visitadorId" = vis.id
      WHERE v."organizationId" = ${orgId}
        AND v."deletedAt" IS NULL
        AND v."dataAgendada" BETWEEN ${from} AND ${to}
      GROUP BY v."visitadorId", vis.nome
      ORDER BY total DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      visitadorId: r.visitadorId,
      visitador: r.visitador,
      total: Number(r.total),
      realizadas: Number(r.realizadas),
      naoRealizadas: Number(r.nao_realizadas),
      canceladas: Number(r.canceladas),
    }));
  }

  private async casosPorStatus(orgId: string): Promise<BucketByLabel[]> {
    const rows = await this.prisma.planoAcao.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({ label: r.status, total: r._count._all }))
      .sort((a, b) => b.total - a.total);
  }

  private async reincidentesTopo(
    orgId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<Reincidente[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ assistidoId: string; assistido: string; total: bigint }>
    >`
      SELECT s."assistidoId" AS "assistidoId", a.nome AS assistido, COUNT(*)::bigint AS total
      FROM solicitacoes_visita s
      JOIN assistidos a ON s."assistidoId" = a.id
      WHERE s."organizationId" = ${orgId}
        AND s."deletedAt" IS NULL
        AND s."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY s."assistidoId", a.nome
      HAVING COUNT(*) > 1
      ORDER BY total DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      assistidoId: r.assistidoId,
      assistido: r.assistido,
      total: Number(r.total),
    }));
  }

  /**
   * Tempo médio (em dias) entre criação da solicitação e a `dataAgendada`
   * da visita gerada por ela. Considera apenas solicitações que viraram
   * visita no período.
   */
  private async tempoMedioSolicitacaoVisita(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Array<{ media: number | null }>>`
      SELECT AVG(EXTRACT(epoch FROM v."dataAgendada" - s."createdAt") / 86400)::float AS media
      FROM solicitacoes_visita s
      JOIN visitas v ON s."visitaId" = v.id
      WHERE s."organizationId" = ${orgId}
        AND s."deletedAt" IS NULL
        AND v."deletedAt" IS NULL
        AND s."createdAt" BETWEEN ${from} AND ${to}
    `;
    const media = rows[0]?.media;
    return media === null || media === undefined ? null : Math.round(media * 10) / 10;
  }

  /**
   * Visitas no prazo: REALIZADAS cuja data efetiva ≤ dataLimiteRecomendada
   * da triagem mais recente da solicitação de origem.
   * Visitas sem triagem com dataLimite são ignoradas (não entram em
   * nenhum dos dois lados).
   */
  private async visitasNoPrazo(orgId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ no_prazo: bigint; fora_do_prazo: bigint }>
    >`
      WITH visitas_com_prazo AS (
        SELECT
          v.id,
          v."dataRealizada",
          (
            SELECT MAX(t."dataLimiteRecomendada")
            FROM triagens t
            JOIN solicitacoes_visita s2 ON s2.id = t."solicitacaoId"
            WHERE s2."visitaId" = v.id
              AND t."organizationId" = ${orgId}
          ) AS "dataLimite"
        FROM visitas v
        WHERE v."organizationId" = ${orgId}
          AND v."deletedAt" IS NULL
          AND v.status = 'REALIZADA'
          AND v."dataAgendada" BETWEEN ${from} AND ${to}
      )
      SELECT
        COUNT(*) FILTER (
          WHERE "dataLimite" IS NOT NULL
            AND "dataRealizada" IS NOT NULL
            AND "dataRealizada" <= "dataLimite"
        )::bigint AS no_prazo,
        COUNT(*) FILTER (
          WHERE "dataLimite" IS NOT NULL
            AND "dataRealizada" IS NOT NULL
            AND "dataRealizada" > "dataLimite"
        )::bigint AS fora_do_prazo
      FROM visitas_com_prazo
    `;
    const r = rows[0];
    return {
      noPrazo: Number(r?.no_prazo ?? 0),
      foraDoPrazo: Number(r?.fora_do_prazo ?? 0),
    };
  }
}

// ---------- Helpers ----------

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}
