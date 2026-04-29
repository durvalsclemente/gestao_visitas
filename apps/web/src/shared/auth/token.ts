import { jwtDecode } from 'jwt-decode';

const STORAGE_KEY = 'gv.jwt';

export type CentralRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

/**
 * Forma "crua" do payload do JWT (campos como vêm da Central).
 */
interface CentralJwtPayload {
  sub: string;
  email: string;
  role: CentralRole;
  organizationId: string;
  exp: number;
  iat: number;
}

/**
 * Projeção usada no frontend. `centralRole` deixa explícito que NÃO é
 * uma role local — vem direto do JWT da Central.
 */
export interface CentralJwtClaims {
  externalUserId: string;
  email: string;
  centralRole: CentralRole;
  organizationId: string;
  exp: number;
  iat: number;
}

/**
 * Captura o JWT vindo da Central:
 * 1) Procura na query string (?token=...) e remove da URL.
 * 2) Senão, lê do sessionStorage (mantém na sessão do tab).
 *
 * NÃO emitimos token aqui — apenas consumimos o que a Central enviou.
 */
export function captureToken(): string | null {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('token');
  if (fromQuery) {
    sessionStorage.setItem(STORAGE_KEY, fromQuery);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
    return fromQuery;
  }
  return sessionStorage.getItem(STORAGE_KEY);
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function decodeClaims(token: string): CentralJwtClaims | null {
  try {
    const payload = jwtDecode<CentralJwtPayload>(token);
    if (!payload?.sub || !payload?.email || !payload?.role || !payload?.organizationId) {
      return null;
    }
    return {
      externalUserId: payload.sub,
      email: payload.email,
      centralRole: payload.role,
      organizationId: payload.organizationId,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

export function isExpired(claims: CentralJwtClaims, skewSeconds = 30): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return claims.exp <= nowSec + skewSeconds;
}
