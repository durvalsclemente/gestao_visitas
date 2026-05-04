/**
 * Cliente OAuth Authorization Code + PKCE (ADR 007 da Central de Acessos).
 *
 * Fluxo:
 *  1. ProtectedRoute / 401 chama `redirectToCentralAuthorize()` → manda o user
 *     para `${CENTRAL_URL}/api/v1/oauth/authorize?response_type=code&...`.
 *  2. Após login na Central, ela faz POST em `/oauth/authorize/issue-code` e
 *     redireciona para `${REDIRECT_URI}?code=...&state=...`.
 *  3. A página `/auth/callback` chama `exchangeCodeForTokens(code,state)` →
 *     POST `/oauth/token` com `code_verifier` → recebe `access_token` (JWE).
 *  4. Em seguida `fetchUserInfo(accessToken)` busca os claims (a JWE não pode
 *     ser decodada no browser — só o backend tem a chave de encryption).
 *  5. O AuthProvider persiste `{token, claims}` em sessionStorage.
 */

const CENTRAL_URL = (import.meta.env.VITE_CENTRAL_URL ?? '').replace(/\/$/, '');
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? 'gestao-visitas';

const STATE_KEY = 'gv.oauth.state';
const VERIFIER_KEY = 'gv.oauth.verifier';
const POST_LOGIN_KEY = 'gv.oauth.post_login';

function getRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
}

function randomBase64Url(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr.buffer);
}

export async function redirectToCentralAuthorize(postLoginPath?: string): Promise<void> {
  if (!CENTRAL_URL) throw new Error('VITE_CENTRAL_URL não configurada');

  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(
    POST_LOGIN_KEY,
    postLoginPath ?? `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    scope: 'openid profile email',
  });

  window.location.replace(`${CENTRAL_URL}/api/v1/oauth/authorize?${params.toString()}`);
}

export interface CentralTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<CentralTokenResponse> {
  if (!CENTRAL_URL) throw new Error('VITE_CENTRAL_URL não configurada');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!expectedState || expectedState !== state) throw new Error('OAuth state mismatch');
  if (!verifier) throw new Error('OAuth code_verifier ausente');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });

  const res = await fetch(`${CENTRAL_URL}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange falhou (${res.status}): ${text || res.statusText}`);
  }

  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return res.json();
}

export interface CentralUserInfo {
  sub: string;
  email: string;
  name?: string;
  org: { id: string; name: string } | null;
  roles: { id: string; code: string }[];
  actions: string[];
  is_super_admin: boolean;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

export async function fetchUserInfo(accessToken: string): Promise<CentralUserInfo> {
  if (!CENTRAL_URL) throw new Error('VITE_CENTRAL_URL não configurada');

  const res = await fetch(`${CENTRAL_URL}/api/v1/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`userinfo falhou (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

export function popPostLoginPath(): string {
  const path = sessionStorage.getItem(POST_LOGIN_KEY);
  sessionStorage.removeItem(POST_LOGIN_KEY);
  return path && path.startsWith('/') ? path : '/';
}

/**
 * Logout SSO — encerra a sessão Central junto com a local.
 * Pega o refresh_token armazenado, limpa todo o storage local e redireciona
 * para `${CENTRAL}/api/v1/oauth/end_session`. A Central revoga a session do
 * refresh, depois manda o navegador pra `/logout` (frontend Central) que
 * limpa o tokenStorage HS256 e devolve o user para `post_logout_redirect_uri`.
 */
export function logoutAndRedirect(): void {
  const refreshToken = sessionStorage.getItem('gv.refresh');

  sessionStorage.clear();

  const params = new URLSearchParams({
    post_logout_redirect_uri: `${window.location.origin}/`,
  });
  if (refreshToken) params.set('refresh_token', refreshToken);

  if (!CENTRAL_URL) {
    window.location.replace('/');
    return;
  }
  window.location.replace(`${CENTRAL_URL}/api/v1/oauth/end_session?${params.toString()}`);
}
