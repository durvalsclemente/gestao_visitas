/**
 * Compat shim — `CentralUser` agora é só um alias do `OSCToken` (ADR 002).
 *
 * Os controllers/services que dependem do antigo shape `{ externalUserId,
 * email, centralRole, organizationId }` ainda funcionam porque acessamos
 * apenas os campos compatíveis (`sub`, `email`, `org.id`). Para checagens
 * de role, agora preferimos `is_super_admin` ou `actions[]` no token.
 */
import type { OSCToken } from '@osc/auth-core';

export type CentralRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

/**
 * Adapta o OSCToken para o shape antigo. Mantido para evitar rewrite
 * em massa de controllers/services. Novos handlers devem consumir
 * `OSCToken` direto via `@CurrentUser()`.
 */
export interface CentralUser {
  externalUserId: string;
  email: string;
  centralRole: CentralRole;
  organizationId: string;
  /** acesso direto ao token original quando o handler precisar de actions[]/is_super_admin */
  __token: OSCToken;
}

export function fromOscToken(token: OSCToken): CentralUser {
  // role legacy: super admin → SUPER_ADMIN; senão tenta inferir de roles[].
  let centralRole: CentralRole = 'ORG_USER';
  if (token.is_super_admin) centralRole = 'SUPER_ADMIN';
  else if (token.roles.some((r) => r.code === 'ORG_ADMIN' || r.code.includes('ADMIN'))) {
    centralRole = 'ORG_ADMIN';
  }
  return {
    externalUserId: token.sub,
    email: token.email,
    centralRole,
    organizationId: token.org?.id ?? '',
    __token: token,
  };
}
