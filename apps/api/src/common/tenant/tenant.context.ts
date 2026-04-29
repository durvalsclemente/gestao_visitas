import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  organizationId: string;
  externalUserId: string;
}

/**
 * Carrega o contexto de tenant do request corrente.
 * Populado pelo TenantInterceptor; consumido pelo PrismaService
 * para injetar organizationId em queries multi-tenant.
 */
export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export function getTenantContext(): TenantContextData | undefined {
  return tenantStorage.getStore();
}
