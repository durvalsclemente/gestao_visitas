import { useEffect, type ReactElement } from 'react';
import { useAuth } from './auth.context';

const CENTRAL_URL = import.meta.env.VITE_CENTRAL_URL ?? '';

/**
 * Sem JWT válido → redireciona para a Central de Acessos.
 * NUNCA mostra tela de login local (regra 1 do CLAUDE.md).
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && CENTRAL_URL) {
      const back = encodeURIComponent(window.location.href);
      window.location.replace(`${CENTRAL_URL}/login?redirect=${back}`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return children;
}
