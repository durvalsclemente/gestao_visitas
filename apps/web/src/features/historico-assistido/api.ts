import { api } from '../../shared/api/client';
import type { HistoricoAssistido, MatriculaAssistido } from './types';

export interface MatriculaPayload {
  assistidoId?: string;
  programaId?: string;
  dataInicio?: string;
  dataFim?: string;
  ativa?: boolean;
  observacoes?: string;
}

export const historicoApi = {
  get: async (assistidoId: string): Promise<HistoricoAssistido> => {
    const { data } = await api.get<HistoricoAssistido>(
      `/assistidos/${assistidoId}/historico`,
    );
    return data;
  },
  listMatriculas: async (assistidoId: string): Promise<MatriculaAssistido[]> => {
    const { data } = await api.get<MatriculaAssistido[]>(
      `/assistidos/${assistidoId}/matriculas`,
    );
    return data;
  },
  createMatricula: async (payload: MatriculaPayload): Promise<MatriculaAssistido> => {
    const { data } = await api.post<MatriculaAssistido>('/matriculas', payload);
    return data;
  },
  updateMatricula: async (
    id: string,
    payload: MatriculaPayload,
  ): Promise<MatriculaAssistido> => {
    const { data } = await api.patch<MatriculaAssistido>(`/matriculas/${id}`, payload);
    return data;
  },
  removeMatricula: async (id: string): Promise<void> => {
    await api.delete(`/matriculas/${id}`);
  },
};
