/**
 * Meridian v2 — entry ESM
 * -----------------------
 * ESM real (import + export + expose): intent, tabs, lineup, normalize, history, export
 * Classic (globais / onclick): data APIs, UI agenda/lib, pipeline, app
 *
 * Regra: só vira ESM se houver import nomeado de deps (não globalThis soup).
 */
import { SHELL_VERSION } from './version.js';
import { expose } from './expose.js';

// ── ESM com contrato real ─────────────────────────────────────────────────
import './lib/intent.js';
import './analysis/tab-helpers.js';
import './analysis/lineup.js';
import './analysis/normalize.js';
import './data/history.js'; // import { migrate… } from normalize
import './export/report.js'; // hostFn só na borda (toast/esc)

expose({ SHELL_VERSION, MERIDIAN_SHELL_VERSION: SHELL_VERSION });

/**
 * Classic: um só modelo de globals (sem globalThis. no corpo).
 * Ordem = dependência de definição em call-time (app define state por último).
 */
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
    '· ESM: intent+normalize+history+export',
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
