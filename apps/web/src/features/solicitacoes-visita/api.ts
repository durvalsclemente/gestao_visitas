import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { SolicitacaoStatus, SolicitacaoVisita } from './types';

export interface ListSolicitacoesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SolicitacaoStatus;
  assistidoId?: string;
  prioridadeId?: string;
  apenasMinhas?: boolean;
}

export type SolicitacaoPayload = {
  assistidoId?: string;
  programaId?: string;
  motivoPrincipalId?: string;
  motivosSecundariosIds?: string[];
  prioridadeId?: string;
  descricaoDetalhada?: string;
  dataFatoGerador?: string;
  frequencia?: string;
  acoesJaRealizadas?: string;
  riscoImediato?: boolean;
  necessidadeAvaliacaoTecnica?: boolean;
  sugestaoPerfilVisitador?: string;
  observacoes?: string;
};

export const solicitacoesApi = {
  list: async (q: ListSolicitacoesQuery): Promise<Paginated<SolicitacaoVisita>> => {
    const { data } = await api.get<Paginated<SolicitacaoVisita>>('/solicitacoes-visita', {
      params: q,
    });
    return data;
  },
  get: async (id: string): Promise<SolicitacaoVisita> => {
    const { data } = await api.get<SolicitacaoVisita>(`/solicitacoes-visita/${id}`);
    return data;
  },
  saveRascunho: async (payload: SolicitacaoPayload): Promise<SolicitacaoVisita> => {
    const { data } = await api.post<SolicitacaoVisita>('/solicitacoes-visita/rascunho', payload);
    return data;
  },
  createAndSubmit: async (payload: SolicitacaoPayload): Promise<SolicitacaoVisita> => {
    const { data } = await api.post<SolicitacaoVisita>('/solicitacoes-visita', payload);
    return data;
  },
  update: async (id: string, payload: SolicitacaoPayload): Promise<SolicitacaoVisita> => {
    const { data } = await api.patch<SolicitacaoVisita>(`/solicitacoes-visita/${id}`, payload);
    return data;
  },
  enviarParaTriagem: async (id: string): Promise<SolicitacaoVisita> => {
    const { data } = await api.post<SolicitacaoVisita>(
      `/solicitacoes-visita/${id}/enviar-triagem`,
    );
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/solicitacoes-visita/${id}`);
  },
};
