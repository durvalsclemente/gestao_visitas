import { api } from './client';
import type { Paginated } from './types';

/**
 * Cliente CRUD genérico para os cadastros padrão (Assistidos,
 * Educadores, Visitadores). Encapsula list/get/create/update/remove.
 */
export function makeCrud<TItem, TCreate, TUpdate, TListQuery extends Record<string, unknown>>(
  resource: string,
) {
  return {
    list: async (q: TListQuery = {} as TListQuery): Promise<Paginated<TItem>> => {
      const { data } = await api.get<Paginated<TItem>>(`/${resource}`, { params: q });
      return data;
    },
    get: async (id: string): Promise<TItem> => {
      const { data } = await api.get<TItem>(`/${resource}/${id}`);
      return data;
    },
    create: async (payload: TCreate): Promise<TItem> => {
      const { data } = await api.post<TItem>(`/${resource}`, payload);
      return data;
    },
    update: async (id: string, payload: TUpdate): Promise<TItem> => {
      const { data } = await api.patch<TItem>(`/${resource}/${id}`, payload);
      return data;
    },
    remove: async (id: string): Promise<void> => {
      await api.delete(`/${resource}/${id}`);
    },
  };
}
