/**
 * Ponte HTML → JS.
 * Lista canônica do que o index.html chama via onclick=...
 * Roda DEPOIS do classic (app/pipeline) para reafirmar no globalThis.
 * Não redefine lógica — só garante que o nome existe no window.
 */
import { expose } from './expose.js';

/** Nomes usados em index.html (onclick / handlers inline). */
export const HTML_ONCLICK_API = [
  'clearAll',
  'closeSidebar',
  'showView',
  'openSettings',
  'openHelpAnalysis',
  'closeHelpAnalysis',
  'toggleSidebar',
  'toggleExportMenu',
  'exportReport',
  'loadSchedule',
  'clearHistory',
  'libBackToComps',
  'setLibFilter',
  'toggleContextEditor',
  'applyContext',
  'toggleModelPop',
  'toggleEffortPop',
  'clearAll',
  'toggleRun',
  'pickModel',
  'pickEffort',
  'toggleStatsCompPop',
  'welcomeSetup',
  'welcomeDismiss',
  'closeContextPromptPopup',
  'confirmContextPrompt',
  'attachSelectionAsContext',
  'copyAgentMenuText',
  'closeSettings',
  'installPwaApp',
  'setTheme',
  'setLang',
  'closeLivePanel',
  'openLibComp',
  'fillMatch',
  'openSaved',
  'openHistory',
];

export function installHtmlBridge() {
  const api = {};
  const missing = [];
  for (const name of HTML_ONCLICK_API) {
    const fn = globalThis[name];
    if (typeof fn === 'function') api[name] = fn;
    else missing.push(name);
  }
  expose(api);
  if (missing.length && typeof location !== 'undefined') {
    const local =
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (local) {
      console.info(
        '[Meridian html-bridge] API pronta ·',
        Object.keys(api).length,
        'fns · ausentes (ok se feature off):',
        missing.filter((n) => n !== 'openLibComp').slice(0, 8)
      );
    }
  }
  return { api, missing };
}

// Auto-install quando este módulo é importado (main chama após classic)
