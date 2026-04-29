import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type {
  AcaoPlano,
  AcompanhamentoPlano,
  PlanoAcao,
  PlanoAcaoStatus,
} from './types';

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PlanoAcaoStatus;
  assistidoId?: string;
  apenasMeus?: boolean;
}

export interface PlanoPayload {
  assistidoId?: string;
  visitaId?: string;
  solicitacaoId?: string;
  objetivo?: string;
  problemaPrincipal?: string;
  areaResponsavel?: string;
  prazo?: string;
  indicadorSucesso?: string;
  status?: PlanoAcaoStatus;
  dataRevisao?: string;
  responsaveisExternalUserIds?: string[];
}

export interface AcaoPayload {
  descricao?: string;
  responsavelExternalUserId?: string;
  prazo?: string;
  ordem?: number;
  concluida?: boolean;
  observacoes?: string;
}

export interface AcompanhamentoPayload {
  evolucao: string;
  dificuldades?: string;
  proximosPassos?: string;
  necessitaNovaVisita?: boolean;
  encerraCaso?: boolean;
}

export const planosApi = {
  list: async (q: ListQuery): Promise<Paginated<PlanoAcao>> => {
    const { data } = await api.get<Paginated<PlanoAcao>>('/planos-acao', { params: q });
    return data;
  },
  get: async (id: string): Promise<PlanoAcao> => {
    const { data } = await api.get<PlanoAcao>(`/planos-acao/${id}`);
    return data;
  },
  create: async (payload: PlanoPayload): Promise<PlanoAcao> => {
    const { data } = await api.post<PlanoAcao>('/planos-acao', payload);
    return data;
  },
  update: async (id: string, payload: PlanoPayload): Promise<PlanoAcao> => {
    const { data } = await api.patch<PlanoAcao>(`/planos-acao/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/planos-acao/${id}`);
  },

  addAcao: async (planoId: string, payload: AcaoPayload): Promise<AcaoPlano> => {
    const { data } = await api.post<AcaoPlano>(`/planos-acao/${planoId}/acoes`, payload);
    return data;
  },
  updateAcao: async (
    planoId: string,
    acaoId: string,
    payload: AcaoPayload,
  ): Promise<AcaoPlano> => {
    const { data } = await api.patch<AcaoPlano>(
      `/planos-acao/${planoId}/acoes/${acaoId}`,
      payload,
    );
    return data;
  },
  removeAcao: async (planoId: string, acaoId: string): Promise<void> => {
    await api.delete(`/planos-acao/${planoId}/acoes/${acaoId}`);
  },

  registrarAcompanhamento: async (
    planoId: string,
    payload: AcompanhamentoPayload,
  ): Promise<AcompanhamentoPlano> => {
    const { data } = await api.post<AcompanhamentoPlano>(
      `/planos-acao/${planoId}/acompanhamentos`,
      payload,
    );
    return data;
  },
};

export const STATUS_LABEL: Record<PlanoAcaoStatus, string> = {
  RASCUNHO: 'Rascunho',
  ATIVO: 'Ativo',
  EM_REVISAO: 'Em revisão',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const STATUS_MAPPING = {
  RASCUNHO: { label: 'Rascunho', tone: 'neutral' as const },
  ATIVO: { label: 'Ativo', tone: 'info' as const },
  EM_REVISAO: { label: 'Em revisão', tone: 'warning' as const },
  CONCLUIDO: { label: 'Concluído', tone: 'success' as const },
  CANCELADO: { label: 'Cancelado', tone: 'error' as const },
};
