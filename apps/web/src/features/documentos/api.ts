import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import type { Documento, NivelSigilo, TipoDocumento } from './types';

export interface ListDocumentosQuery {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: TipoDocumento;
  sigilo?: NivelSigilo;
  assistidoId?: string;
  solicitacaoId?: string;
  visitaId?: string;
  relatorioId?: string;
  planoAcaoId?: string;
  apenasMeus?: boolean;
}

export interface DocumentoPayload {
  nome: string;
  fileName: string;
  mimeType: string;
  tamanho: number;
  url: string;
  hash?: string;
  tipo?: TipoDocumento;
  sigilo?: NivelSigilo;
  descricao?: string;
  assistidoId?: string;
  solicitacaoId?: string;
  visitaId?: string;
  relatorioId?: string;
  planoAcaoId?: string;
}

export const documentosApi = {
  list: async (q: ListDocumentosQuery): Promise<Paginated<Documento>> => {
    const { data } = await api.get<Paginated<Documento>>('/documentos', { params: q });
    return data;
  },
  get: async (id: string): Promise<Documento> => {
    const { data } = await api.get<Documento>(`/documentos/${id}`);
    return data;
  },
  create: async (payload: DocumentoPayload): Promise<Documento> => {
    const { data } = await api.post<Documento>('/documentos', payload);
    return data;
  },
  update: async (id: string, payload: Partial<DocumentoPayload>): Promise<Documento> => {
    const { data } = await api.patch<Documento>(`/documentos/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/documentos/${id}`);
  },
};
