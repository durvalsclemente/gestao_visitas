export type CentralRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';

export const VALID_CENTRAL_ROLES: ReadonlySet<CentralRole> = new Set([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'ORG_USER',
]);

/**
 * Contexto derivado do JWT da Central de Acessos.
 *
 * Campos prefixados com "central" / "external" para deixar claro que
 * NÃO existem entidades locais correspondentes (CLAUDE.md §2):
 *   - externalUserId : referência ao usuário na Central (JWT.sub)
 *   - centralRole    : role autoritativa do JWT — não há role local
 *   - organizationId : referência ao tenant (UUID da Central)
 */
export interface CentralUser {
  externalUserId: string;
  email: string;
  centralRole: CentralRole;
  organizationId: string;
}

/**
 * Estrutura esperada do payload do JWT emitido pela Central.
 * Mantida separada de CentralUser para deixar explícito o mapeamento.
 */
export interface CentralJwtPayload {
  sub: string;
  email: string;
  role: CentralRole;
  organizationId: string;
  iat: number;
  exp: number;
}
