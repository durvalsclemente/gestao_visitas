import type { CentralUserInfo } from './oauth';

const TOKEN_KEY = 'gv.jwt';
const REFRESH_KEY = 'gv.refresh';
const CLAIMS_KEY = 'gv.claims';

export type CentralRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

/**
 * Projeção usada no frontend. NÃO é uma role local — é derivada do
 * `is_super_admin` + role principal vindos da Central via `/oauth/userinfo`.
 */
export interface CentralJwtClaims {
  externalUserId: string;
  email: string;
  name?: string;
  centralRole: CentralRole;
  organizationId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  actions: string[];
  exp: number;
  iat: number;
}

export function setSession(token: string, refreshToken: string | undefined, claims: CentralJwtClaims): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
  sessionStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredClaims(): CentralJwtClaims | null {
  const raw = sessionStorage.getItem(CLAIMS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CentralJwtClaims;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(CLAIMS_KEY);
}

export function isExpired(claims: CentralJwtClaims, skewSeconds = 30): boolean {
  if (!claims.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return claims.exp <= nowSec + skewSeconds;
}

/**
 * Converte a resposta de `/oauth/userinfo` no shape usado pelo frontend.
 * A Central devolve `roles: [{id, code}]` e `is_super_admin: bool`.
 */
export function claimsFromUserInfo(info: CentralUserInfo): CentralJwtClaims {
  const roleCodes = (info.roles ?? []).map((r) => r.code);
  const centralRole: CentralRole = info.is_super_admin
    ? 'SUPER_ADMIN'
    : roleCodes.some((c) => /admin/i.test(c))
      ? 'ORG_ADMIN'
      : 'ORG_USER';
  return {
    externalUserId: info.sub,
    email: info.email,
    name: info.name,
    centralRole,
    organizationId: info.org?.id ?? null,
    isSuperAdmin: !!info.is_super_admin,
    roles: roleCodes,
    actions: info.actions ?? [],
    exp: typeof info.exp === 'number' ? info.exp : 0,
    iat: typeof info.iat === 'number' ? info.iat : 0,
  };
}
