/**
 * Meridian v2 — entry ESM
 * -----------------------
 * Camada A (import real): intent, tabs, lineup, normalize, history, export
 * Camada B (clássicos): data/UI/pipeline/app — ainda globais para onclick HTML
 *
 * Padrão de migração: sair de CLASSIC → import + expose; bordas via runtime.host()
 */
import { SHELL_VERSION } from './version.js';
import { expose } from './expose.js';

// ── ESM (export + expose no globalThis) ───────────────────────────────────
import './lib/intent.js';
import './analysis/tab-helpers.js';
import './analysis/lineup.js';
import './analysis/normalize.js';
import './data/history.js';
import './export/report.js';

expose({ SHELL_VERSION, MERIDIAN_SHELL_VERSION: SHELL_VERSION });

/** Scripts clássicos restantes (ordem = dependência de runtime). */
const CLASSIC = [
  'js/analysis/prompts.js',
  'js/analysis/render.js',
  'js/data/espn.js',
  'js/data/football-apis.js',
  'js/data/schedule.js',
  'js/data/live.js',
  'js/ui/featured.js',
  'js/ui/library.js',
  'js/analysis/pipeline-facts.js',
  'js/analysis/pipeline-run.js',
  'js/app.js',
];

function loadClassic(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src + (src.includes('?') ? '&' : '?') + 'v=' + SHELL_VERSION;
    s.async = false;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error('Falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

try {
  for (const src of CLASSIC) {
    await loadClassic(src);
  }
  console.info(
    '[Meridian v2] shell',
    SHELL_VERSION,
    '· ESM:',
    'intent+tabs+lineup+normalize+history+export',
    '· classic:',
    CLASSIC.length
  );
} catch (err) {
  console.error('[Meridian v2] bootstrap failed', err);
  const box = document.getElementById('error-box');
  const msg = document.getElementById('error-msg');
  if (box && msg) {
    box.style.display = 'block';
    msg.textContent =
      'Falha ao carregar o app: ' + (err && err.message ? err.message : String(err));
  }
}
