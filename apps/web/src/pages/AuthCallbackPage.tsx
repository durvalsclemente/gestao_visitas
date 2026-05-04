import { useEffect, useState } from 'react';
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  popPostLoginPath,
  redirectToCentralAuthorize,
} from '../shared/auth/oauth';
import { claimsFromUserInfo, setSession } from '../shared/auth/token';

/**
 * Recebe `?code=...&state=...` da Central, troca por access_token (JWE) +
 * refresh_token, busca os claims via `/oauth/userinfo` e persiste a sessão.
 * Em seguida redireciona para a rota original que o user tentava acessar.
 */
export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errParam = url.searchParams.get('error');

    if (errParam) {
      setError(`A Central recusou o login: ${errParam}`);
      return;
    }
    if (!code || !state) {
      // chegou aqui sem params — provavelmente o user navegou direto.
      // reinicia o handshake para evitar tela em branco.
      void redirectToCentralAuthorize('/');
      return;
    }

    (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code, state);
        const userInfo = await fetchUserInfo(tokens.access_token);
        const claims = claimsFromUserInfo(userInfo);
        setSession(tokens.access_token, tokens.refresh_token, claims);
        const target = popPostLoginPath();
        window.location.replace(target);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao concluir login');
      }
    })();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h2>Não foi possível concluir o login</h2>
        <p style={{ color: '#a00' }}>{error}</p>
        <p>
          <a href="/">Tentar novamente</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      Concluindo login…
    </div>
  );
}
