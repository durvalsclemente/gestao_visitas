import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  clearToken,
  getStoredClaims,
  getStoredToken,
  isExpired,
  type CentralJwtClaims,
} from './token';
import { logoutAndRedirect } from './oauth';

interface AuthState {
  token: string | null;
  user: CentralJwtClaims | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const token = getStoredToken();
    const claims = getStoredClaims();
    if (!token || !claims || isExpired(claims)) {
      if (token || claims) clearToken();
      return { token: null, user: null };
    }
    return { token, user: claims };
  }, []);

  const [state, setState] = useState(initial);

  const value: AuthState = {
    token: state.token,
    user: state.user,
    isAuthenticated: !!state.token && !!state.user,
    signOut: () => {
      // Single-logout: revoga a sessão na Central e limpa local.
      // logoutAndRedirect já faz sessionStorage.clear() antes de sair.
      clearToken();
      setState({ token: null, user: null });
      logoutAndRedirect();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
