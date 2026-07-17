/**
 * Acesso ao host global (app clássico / HTML onclick).
 * Usado só nas bordas de módulos ESM ainda acoplados ao shell.
 * Preferir import nomeado quando o símbolo migrar de verdade.
 */
export function host() {
  return globalThis;
}

/** Lê função do host; no-op se ainda não carregou (evita throw em bootstrap). */
export function hostFn(name) {
  const fn = globalThis[name];
  return typeof fn === 'function' ? fn : null;
}
