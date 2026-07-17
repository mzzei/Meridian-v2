/* js/data/history.js — persistência e reabertura de análises
 * Depende em runtime: HIST_KEY, _history (app), migrateAnalysisPayload,
 * renderResults, renderRecentAnalyses, renderSidebarHistory, esc, CSS
 */
function loadHistory() {
  try {
    _history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  } catch (e) {
    _history = [];
  }
  let dirty = false;
  for (const h of _history) {
    if (!h || !h.data) continue;
    if (h.data._schema === ANALYSIS_SCHEMA) continue;
    try {
      h.data = migrateAnalysisPayload(h.data);
      dirty = true;
    } catch (_) {}
  }
  if (dirty) persistHistory();
}

function persistHistory() {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(_history.slice(0, 30)));
  } catch (e) {}
}

function saveAnalysis(hid, d) {
  // Pipeline já grava schema 2; se veio sem schema (edge), migra uma vez
  if (d && d._schema !== ANALYSIS_SCHEMA) d = migrateAnalysisPayload(d) || d;
  _history = _history.filter((h) => h.hid !== hid);
  _history.unshift({
    hid,
    title: d.partida || 'Análise',
    fase: d.fase || '',
    ts: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    data: d,
  });
  if (_history.length > 30) _history = _history.slice(0, 30);
  persistHistory();
  renderRecentAnalyses();
  renderSidebarHistory();
}

function clearHistory() {
  if (!_history.length) return;
  _history = [];
  persistHistory();
  renderRecentAnalyses();
  renderSidebarHistory();
}

function cardByHid(hid) {
  return document.querySelector(
    '.a-card[data-hid="' + (window.CSS && CSS.escape ? CSS.escape(hid) : hid) + '"]'
  );
}

function ensureRendered(hid) {
  let card = cardByHid(hid);
  if (card) return card;
  const h = _history.find((x) => x.hid === hid);
  if (!h) return null;
  if (h.data && h.data._schema !== ANALYSIS_SCHEMA) {
    h.data = migrateAnalysisPayload(h.data) || h.data;
  }
  renderResults(h.data, { hid, save: false });
  return cardByHid(hid);
}

function openHistory(hid) {
  const card = ensureRendered(hid);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    flashCard(card);
  }
}

function renderRecentAnalyses() {
  if (_currentView === 'saved') renderSavedReports();
}

if (typeof window !== 'undefined') {
  window.loadHistory = loadHistory;
  window.persistHistory = persistHistory;
  window.saveAnalysis = saveAnalysis;
  window.clearHistory = clearHistory;
  window.cardByHid = cardByHid;
  window.ensureRendered = ensureRendered;
  window.openHistory = openHistory;
  window.renderRecentAnalyses = renderRecentAnalyses;
}
