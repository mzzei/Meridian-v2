/* js/data/history.js — persistência e reabertura de análises (ESM) */
import { expose } from '../expose.js';
import { host, hostFn } from '../runtime.js';
import { ANALYSIS_SCHEMA, migrateAnalysisPayload } from '../analysis/normalize.js';

const DEFAULT_HIST_KEY = 'meridian_history_v1';

function histKey() {
  return host().HIST_KEY || DEFAULT_HIST_KEY;
}

function getHistory() {
  const h = host();
  if (!Array.isArray(h._history)) h._history = [];
  return h._history;
}

function setHistory(list) {
  host()._history = Array.isArray(list) ? list : [];
}

export function loadHistory() {
  const h = host();
  try {
    h._history = JSON.parse(localStorage.getItem(histKey()) || '[]');
  } catch (e) {
    h._history = [];
  }
  if (!Array.isArray(h._history)) h._history = [];

  let dirty = false;
  for (const entry of h._history) {
    if (!entry || !entry.data) continue;
    if (entry.data._schema === ANALYSIS_SCHEMA) continue;
    try {
      entry.data = migrateAnalysisPayload(entry.data);
      dirty = true;
    } catch (_) {}
  }
  if (dirty) persistHistory();
}

export function persistHistory() {
  try {
    localStorage.setItem(histKey(), JSON.stringify(getHistory().slice(0, 30)));
  } catch (e) {}
}

export function saveAnalysis(hid, d) {
  if (d && d._schema !== ANALYSIS_SCHEMA) d = migrateAnalysisPayload(d) || d;
  let list = getHistory().filter((x) => x.hid !== hid);
  list.unshift({
    hid,
    title: (d && d.partida) || 'Análise',
    fase: (d && d.fase) || '',
    ts: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    data: d,
  });
  if (list.length > 30) list = list.slice(0, 30);
  setHistory(list);
  persistHistory();
  const recent = hostFn('renderRecentAnalyses');
  if (recent) recent();
  const side = hostFn('renderSidebarHistory');
  if (side) side();
}

export function clearHistory() {
  if (!getHistory().length) return;
  setHistory([]);
  persistHistory();
  const recent = hostFn('renderRecentAnalyses');
  if (recent) recent();
  const side = hostFn('renderSidebarHistory');
  if (side) side();
}

export function cardByHid(hid) {
  const escId =
    typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(hid) : String(hid || '');
  return document.querySelector('.a-card[data-hid="' + escId + '"]');
}

export function ensureRendered(hid) {
  let card = cardByHid(hid);
  if (card) return card;
  const entry = getHistory().find((x) => x.hid === hid);
  if (!entry) return null;
  if (entry.data && entry.data._schema !== ANALYSIS_SCHEMA) {
    entry.data = migrateAnalysisPayload(entry.data) || entry.data;
  }
  const render = hostFn('renderResults');
  if (render) render(entry.data, { hid, save: false });
  return cardByHid(hid);
}

export function openHistory(hid) {
  const card = ensureRendered(hid);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const flash = hostFn('flashCard');
    if (flash) flash(card);
  }
}

export function renderRecentAnalyses() {
  const h = host();
  if (h._currentView === 'saved') {
    const fn = hostFn('renderSavedReports');
    if (fn) fn();
  }
}

expose({
  loadHistory,
  persistHistory,
  saveAnalysis,
  clearHistory,
  cardByHid,
  ensureRendered,
  openHistory,
  renderRecentAnalyses,
});
