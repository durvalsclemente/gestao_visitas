/**
 * Diff superficial: devolve apenas as chaves cujo valor mudou
 * entre `before` e `after`, no formato `{ campo: [valorAntes, valorNovo] }`.
 *
 * Comparação por `JSON.stringify` para suportar nested simples e arrays.
 * Não detecta mudanças profundas em sub-objetos (substitui o objeto
 * inteiro), o que é adequado para um trail humano-legível.
 */
export function shallowDiff(
  before: unknown,
  after: unknown,
): Record<string, [unknown, unknown]> | null {
  if (!isPlainObject(before) || !isPlainObject(after)) return null;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of keys) {
    const a = (before as Record<string, unknown>)[k];
    const b = (after as Record<string, unknown>)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = [a, b];
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Remove campos sensíveis ou ruído antes de gravar no AuditLog.
 * Mantém o registro humano-legível e evita persistir tokens.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'authorization',
  'assinaturaImagem',
]);

export function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitize) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitize(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}
