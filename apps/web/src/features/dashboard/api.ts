import { api } from '../../shared/api/client';

export interface DashboardMetrics {
  periodo: { from: string; to: string };
  totals: {
    solicitacoesNoPeriodo: number;
    visitasRealizadas: number;
    visitasAgendadas: number;
    relatoriosFinalizados: number;
    casosAbertos: number;
    casosEncerrados: number;
    encaminhamentos: number;
    reincidencias: number;
    tempoMedioSolicitacaoVisitaDias: number | null;
    visitasNoPrazo: number;
    visitasForaDoPrazo: number;
  };
  solicitacoesPorPeriodo: Array<{ mes: string; total: number }>;
  solicitacoesPorMotivo: Array<{ label: string; total: number }>;
  solicitacoesPorPrograma: Array<{ label: string; total: number }>;
  visitasPorCriticidade: Array<{ label: string; total: number }>;
  visitasPorVisitador: Array<{
    visitadorId: string;
    visitador: string;
    total: number;
    realizadas: number;
    naoRealizadas: number;
    canceladas: number;
  }>;
  casosPorStatus: Array<{ label: string; total: number }>;
  reincidentesTopo: Array<{ assistidoId: string; assistido: string; total: number }>;
}

export const dashboardApi = {
  metrics: async (q: { from?: string; to?: string }): Promise<DashboardMetrics> => {
    const { data } = await api.get<DashboardMetrics>('/dashboard', { params: q });
    return data;
  },
};
