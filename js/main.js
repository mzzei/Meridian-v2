/**
 * Meridian v2 — entry ESM
 *
 * 1) competitions + state (fonte de verdade + bridges classic)
 * 2) ESM real (intent, normalize, history, export, …)
 * 3) classic (pipeline, UI agenda, app)
 * 4) html-bridge (garante onclick do HTML)
 */
import { SHELL_VERSION } from './version.js';
import { expose } from './expose.js';
import { installHtmlBridge } from './html-bridge.js';

// Fundações (antes de qualquer classic)
import './comp/competitions.js';
import './state.js';

// ESM com import real de deps
import './lib/intent.js';
import './analysis/tab-helpers.js';
import './analysis/lineup.js';
import './analysis/normalize.js';
import './data/history.js';
import './export/report.js';
// Passos 2–5: pipeline ESM (facts + run)
import './analysis/pipeline-facts.js';
import './analysis/pipeline-run.js';

expose({ SHELL_VERSION, MERIDIAN_SHELL_VERSION: SHELL_VERSION });

const CLASSIC = [
  'js/analysis/prompts.js',
  'js/analysis/render.js',
  'js/data/cached-fetch.js',
  'js/data/source-telemetry.js',
  'js/data/espn.js',
  'js/data/football-apis.js',
  'js/data/free-sources.js',
  'js/data/facts-memory.js',
  'js/data/phase1-context.js',
  'js/data/source-health.js',
  'js/data/schedule.js',
  'js/data/live.js',
  'js/data/lineup-confirmed.js',
  'js/ui/featured.js',
  'js/ui/library.js',
  'js/app.js',
  // MODO DEMO (?demo=1) — precisa vir DEPOIS do app.js: sobrescreve o valor do
  // input de chave já restaurado e o patch de fetch pega qualquer análise
  'js/demo.js',
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
  // Bridge HTML por último (funções do app já existem)
  installHtmlBridge();

  console.info(
    '[Meridian v2] shell',
    SHELL_VERSION,
    '· state+competitions+pipeline',
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
