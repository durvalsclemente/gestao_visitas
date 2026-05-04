import { useEffect, type ReactElement } from 'react';
import { useAuth } from './auth.context';
import { redirectToCentralAuthorize } from './oauth';

/**
 * Sem JWT válido → inicia OAuth Authorization Code + PKCE contra a Central.
 * NUNCA mostra tela de login local (regra 1 do CLAUDE.md).
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      void redirectToCentralAuthorize();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return children;
}
