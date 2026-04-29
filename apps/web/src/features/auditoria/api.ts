import { api } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';

export interface AuditLogItem {
  id: string;
  occurredAt: string;
  organizationId?: string | null;
  externalUserId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ListAuditQuery {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  entityId?: string;
  externalUserId?: string;
  from?: string;
  to?: string;
}

export const auditoriaApi = {
  list: async (q: ListAuditQuery): Promise<Paginated<AuditLogItem>> => {
    const { data } = await api.get<Paginated<AuditLogItem>>('/audit', { params: q });
    return data;
  },
};
