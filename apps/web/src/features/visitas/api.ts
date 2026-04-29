import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type {
  AgendaQuery,
  DesignarPayload,
  Disponibilidade,
  Visita,
} from './types';

export const visitasApi = {
  agenda: async (q: AgendaQuery): Promise<Paginated<Visita>> => {
    const { data } = await api.get<Paginated<Visita>>('/visitas/agenda', { params: q });
    return data;
  },
  agendaVisitador: async (visitadorId: string, q: AgendaQuery): Promise<Paginated<Visita>> => {
    const { data } = await api.get<Paginated<Visita>>(
      `/visitas/agenda/visitador/${visitadorId}`,
      { params: q },
    );
    return data;
  },
  get: async (id: string): Promise<Visita> => {
    const { data } = await api.get<Visita>(`/visitas/${id}`);
    return data;
  },
  designar: async (payload: DesignarPayload): Promise<Visita> => {
    const { data } = await api.post<Visita>('/visitas/designar', payload);
    return data;
  },
  reagendar: async (
    id: string,
    payload: { novaDataAgendada: string; motivoReagendamento?: string },
  ): Promise<Visita> => {
    const { data } = await api.patch<Visita>(`/visitas/${id}/reagendar`, payload);
    return data;
  },
  cancelar: async (id: string, payload: { motivoCancelamento: string }): Promise<Visita> => {
    const { data } = await api.patch<Visita>(`/visitas/${id}/cancelar`, payload);
    return data;
  },
  confirmar: async (id: string): Promise<Visita> => {
    const { data } = await api.patch<Visita>(`/visitas/${id}/confirmar`);
    return data;
  },
  realizar: async (
    id: string,
    payload: { dataRealizada?: string; resultado?: string },
  ): Promise<Visita> => {
    const { data } = await api.patch<Visita>(`/visitas/${id}/realizar`, payload);
    return data;
  },
};

export const disponibilidadesApi = {
  list: async (visitadorId: string): Promise<Disponibilidade[]> => {
    const { data } = await api.get<Disponibilidade[]>(
      `/visitadores/${visitadorId}/disponibilidades`,
    );
    return data;
  },
  create: async (
    visitadorId: string,
    payload: Omit<Disponibilidade, 'id' | 'visitadorId'>,
  ): Promise<Disponibilidade> => {
    const { data } = await api.post<Disponibilidade>(
      `/visitadores/${visitadorId}/disponibilidades`,
      payload,
    );
    return data;
  },
  remove: async (visitadorId: string, id: string): Promise<void> => {
    await api.delete(`/visitadores/${visitadorId}/disponibilidades/${id}`);
  },
};

export const STATUS_LABEL = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  NAO_REALIZADA: 'Não realizada',
  CANCELADA: 'Cancelada',
  REAGENDADA: 'Reagendada',
} as const;

export const STATUS_MAPPING = {
  AGENDADA: { label: 'Agendada', tone: 'info' as const },
  REALIZADA: { label: 'Realizada', tone: 'success' as const },
  NAO_REALIZADA: { label: 'Não realizada', tone: 'warning' as const },
  CANCELADA: { label: 'Cancelada', tone: 'error' as const },
  REAGENDADA: { label: 'Reagendada', tone: 'warning' as const },
};
