/* js/export/report.js — export HTML / PDF one-click (ESM · lib local) */
import { expose } from '../expose.js';
import { host, hostFn } from '../runtime.js';

function toastMsg(msg) {
  const fn = hostFn('toast');
  if (fn) fn(msg);
}

function tKey(key) {
  const fn = hostFn('t');
  return fn ? fn(key) : undefined;
}

function escHtml(s) {
  const fn = hostFn('esc');
  if (fn) return fn(s);
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brand() {
  const fn = hostFn('brandStar');
  return fn ? fn() : '';
}

function labelComp() {
  const fn = hostFn('compLabel');
  const id = host()._activeCompId;
  return fn ? fn(id) : 'Meridian';
}

/** format: 'html' | 'pdf' */
export function exportReport(format) {
  const cards = [...document.querySelectorAll('#conversation .a-card')];
  if (!cards.length) {
    const box = document.getElementById('error-box');
    const msg = document.getElementById('error-msg');
    if (box) box.style.display = 'block';
    if (msg)
      msg.textContent = 'Nenhuma análise para exportar. Faça ao menos uma análise primeiro.';
    toastMsg(tKey('export_none') || 'Nenhuma análise para exportar.');
    return;
  }
  exportCards(cards, { format: format === 'pdf' ? 'pdf' : 'html' });
}

export function exportSingle(hid, format) {
  const ensure = hostFn('ensureRendered');
  const card = ensure ? ensure(hid) : null;
  if (card) exportCards([card], { single: true, format: format === 'pdf' ? 'pdf' : 'html' });
}

export function toggleExportMenu(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const pop = document.getElementById('export-pop');
  if (!pop) return;
  const open = pop.style.display === 'block';
  pop.style.display = open ? 'none' : 'block';
  pop.setAttribute('aria-hidden', open ? 'true' : 'false');
  if (!open) {
    const close = (ev) => {
      if (
        ev.target.closest &&
        (ev.target.closest('#export-pop') || ev.target.closest('#export-menu-btn'))
      )
        return;
      pop.style.display = 'none';
      pop.setAttribute('aria-hidden', 'true');
      document.removeEventListener('click', close, true);
    };
    setTimeout(() => document.addEventListener('click', close, true), 0);
  }
}

let _exportAppCssCache = null,
  _exportPrintCssCache = null;

async function _loadExportAppCss() {
  if (_exportAppCssCache != null) return _exportAppCssCache;
  try {
    const href =
      (document.querySelector('link[rel="stylesheet"][href*="app.css"]') || {}).href ||
      'css/app.css?v=' + Date.now();
    const r = await fetch(href, { cache: 'force-cache' });
    _exportAppCssCache = r.ok ? await r.text() : '';
  } catch {
    _exportAppCssCache = '';
  }
  return _exportAppCssCache;
}

async function _loadExportPrintCss() {
  if (_exportPrintCssCache != null) return _exportPrintCssCache;
  try {
    const r = await fetch('css/print-report.css?v=' + Date.now(), { cache: 'force-cache' });
    _exportPrintCssCache = r.ok ? await r.text() : '';
  } catch {
    _exportPrintCssCache = '';
  }
  return _exportPrintCssCache;
}

export function exportCards(cardEls, opts) {
  opts = opts || {};
  Promise.all([_loadExportAppCss(), _loadExportPrintCss()]).then(([appCss, printCss]) => {
    try {
      _exportCardsWithCss(cardEls, opts, appCss || '', printCss || '');
    } catch (e) {
      console.error(e);
      toastMsg('Falha ao montar o relatório. Tente de novo.');
    }
  });
}

export function exportSlugify(title, maxLen) {
  maxLen = maxLen || 40;
  return (
    (title || 'analise')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, maxLen) || 'analise'
  );
}

export function buildExportHtml(cardEls, opts, appCss, printCss) {
  opts = opts || {};
  const clone = document.createElement('div');
  cardEls.forEach((c) => clone.appendChild(c.cloneNode(true)));
  clone.querySelectorAll('.a-card').forEach((card) => {
    card.querySelectorAll('.a-ic,.a-status,.a-hdr,.disc,.a-tab-pill').forEach((b) => b.remove());
    const tcs = card.querySelectorAll('.a-tc'),
      btns = card.querySelectorAll('.a-tab');
    tcs.forEach((tc, i) => {
      tc.style.display = 'block';
      const h = document.createElement('div');
      h.className = 'print-tabname';
      h.textContent = btns[i] ? btns[i].textContent.trim() : 'Seção ' + (i + 1);
      tc.insertBefore(h, tc.firstChild);
    });
    card.querySelectorAll('.bfill[data-w],.ev-bar-fill[data-w]').forEach((b) => {
      const w = Number(b.getAttribute('data-w') || b.dataset.w || 0);
      b.style.transform = 'scaleX(' + Math.max(0, Math.min(100, w)) / 100 + ')';
    });
  });
  const inlineCss = [...document.querySelectorAll('style')]
    .map((s) => s.textContent)
    .filter(Boolean)
    .join('\n\n');
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const count = clone.querySelectorAll('.a-card').length;
  const theme =
    typeof host().currentTheme === 'string' && host().currentTheme
      ? host().currentTheme
      : 'aurora';
  const bgPrint = theme === 'verde' ? '#04130c' : theme === 'mono' ? '#b8b8b8' : '#0c1016';
  const cl = labelComp();
  const html = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório · Meridian · ${escHtml(cl)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
${appCss}
${inlineCss}
${printCss || ''}
html,body{background:${bgPrint}!important}
body.printing .a-tc{display:block!important}
body.printing .a-tabs,.no-print{display:none!important}
</style>
</head>
<body class="printing">
<div class="rep-wrap">
  <div class="rep-head">
    <div class="rep-brand">
      <div class="rep-ball">${brand()}</div>
      <div>
        <div class="rep-title">MERIDIAN<span class="rep-title-sub">SPORTS INTELLIGENCE</span></div>
        <div class="rep-meta">${escHtml(cl)} · ${dateStr} · ${count} análise${count !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="rep-actions no-print">
      <button type="button" class="rep-print rep-print-pdf" onclick="window.print()">Salvar como PDF</button>
      <div class="rep-print-hint">Impressão nativa do navegador: escolha "Salvar como PDF" no destino. Paginação vetorial, arquivo leve.</div>
    </div>
  </div>
  ${clone.innerHTML}
  <div class="rep-disc">Análise estatística baseada em modelo de Poisson e dados reais · não é recomendação financeira · Meridian</div>
</div>
${opts.autoPrint ? `<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},350);});</script>` : ''}
</body>
</html>`;
  return { html, now, count, theme };
}

function _exportFileSlug(cardEls, opts, now) {
  const slug =
    opts.single && cardEls[0]
      ? exportSlugify(cardEls[0].querySelector('.a-title')?.textContent || 'analise')
      : 'relatorio';
  const compSlug = exportSlugify(labelComp() || 'meridian', 24);
  return `meridian-${compSlug}-${slug}-${now.toISOString().slice(0, 10)}`;
}

function _exportCardsWithCss(cardEls, opts, appCss, printCss) {
  opts = opts || {};
  // PDF = LÓGICA DO V1 (shell 81): impressão NATIVA do navegador sobre o relatório
  // HTML — vetorial, leve, quebras de página pelo @media print. O html2pdf
  // (rasterização html2canvas) foi removido: gerava PDFs quebrados de 40+ páginas
  // (fatias JPEG + pagebreak avoid num card de vários metros).
  if (opts.format === 'pdf') opts.autoPrint = true;
  const built = buildExportHtml(cardEls, opts, appCss, printCss);
  const { html, now } = built;
  const baseName = _exportFileSlug(cardEls, opts, now);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (opts.format === 'pdf') {
    // abre o relatório numa aba; o script autoPrint chama window.print() no load —
    // um clique em "Salvar como PDF" e pronto. Popup bloqueado → baixa o HTML
    // (que tem o botão "Salvar como PDF" no topo).
    const w = window.open(url, '_blank');
    if (w) {
      toastMsg('Relatório aberto — escolha "Salvar como PDF" na impressão.');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName + '.html';
      a.click();
      toastMsg('Popup bloqueado — baixei o HTML. Abra e clique em "Salvar como PDF".');
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = baseName + '.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toastMsg('HTML baixado.');
}

expose({
  exportReport,
  exportSingle,
  toggleExportMenu,
  exportCards,
  buildExportHtml,
  exportSlugify,
});
