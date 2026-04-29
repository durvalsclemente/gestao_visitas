import { InternalServerErrorException } from '@nestjs/common';
import { getTenantContext, type TenantContextData } from './tenant.context';

/**
 * Lê o contexto de tenant injetado pelo TenantInterceptor.
 * Se faltar (ex.: chamada fora de request HTTP autenticada), aborta
 * com 500 — falha clara em vez de gravar dado órfão.
 */
export function requireTenant(): TenantContextData {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new InternalServerErrorException('Contexto de tenant ausente — operação inválida');
  }
  return ctx;
}
