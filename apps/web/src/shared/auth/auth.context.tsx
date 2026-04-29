import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  captureToken,
  clearToken,
  decodeClaims,
  isExpired,
  type CentralJwtClaims,
} from './token';

interface AuthState {
  token: string | null;
  user: CentralJwtClaims | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const token = captureToken();
    if (!token) return { token: null, user: null };
    const claims = decodeClaims(token);
    if (!claims || isExpired(claims)) {
      clearToken();
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
      clearToken();
      setState({ token: null, user: null });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
