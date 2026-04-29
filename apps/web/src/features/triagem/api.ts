import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { SolicitacaoStatus } from '../solicitacoes-visita/types';
import type { FilaItem, Triagem, TriagemDecisao } from './types';

export interface DecidirPayload {
  complexidade: string;
  tipoAtendimentoIndicado?: string;
  necessidadeDuplaVisita?: boolean;
  necessidadePsicologo?: boolean;
  necessidadeAssistenteSocial?: boolean;
  dataLimiteRecomendada?: string;
  justificativaTecnica: string;
  decisao: TriagemDecisao;
  prioridadeReclassificadaId?: string;
  setorEncaminhamentoId?: string;
}

export const triagemApi = {
  fila: async (q: { page?: number; limit?: number; status?: SolicitacaoStatus } = {}): Promise<
    Paginated<FilaItem>
  > => {
    const { data } = await api.get<Paginated<FilaItem>>('/triagem/fila', { params: q });
    return data;
  },
  historico: async (solicitacaoId: string): Promise<Triagem[]> => {
    const { data } = await api.get<Triagem[]>(
      `/triagem/solicitacao/${solicitacaoId}/historico`,
    );
    return data;
  },
  assumir: async (solicitacaoId: string) => {
    const { data } = await api.post(`/triagem/solicitacao/${solicitacaoId}/assumir`);
    return data;
  },
  decidir: async (solicitacaoId: string, payload: DecidirPayload) => {
    const { data } = await api.post(
      `/triagem/solicitacao/${solicitacaoId}/decidir`,
      payload,
    );
    return data;
  },
};
