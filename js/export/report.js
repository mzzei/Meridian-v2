/* js/export/report.js — export HTML / PDF one-click (lib local em assets/vendor) */
/** format: 'html' | 'pdf' */
function exportReport(format) {
  const cards = [...document.querySelectorAll('#conversation .a-card')];
  if (!cards.length) {
    document.getElementById('error-box').style.display = 'block';
    document.getElementById('error-msg').textContent =
      'Nenhuma análise para exportar. Faça ao menos uma análise primeiro.';
    toast(t('export_none') || 'Nenhuma análise para exportar.');
    return;
  }
  exportCards(cards, { format: format === 'pdf' ? 'pdf' : 'html' });
}

function exportSingle(hid, format) {
  const card = ensureRendered(hid);
  if (card) exportCards([card], { single: true, format: format === 'pdf' ? 'pdf' : 'html' });
}

function toggleExportMenu(e) {
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
      if (ev.target.closest && (ev.target.closest('#export-pop') || ev.target.closest('#export-menu-btn')))
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

function exportCards(cardEls, opts) {
  opts = opts || {};
  Promise.all([_loadExportAppCss(), _loadExportPrintCss()])
    .then(([appCss, printCss]) => {
      try {
        _exportCardsWithCss(cardEls, opts, appCss || '', printCss || '');
      } catch (e) {
        console.error(e);
        toast('Falha ao montar o relatório. Tente de novo.');
      }
    });
}

function exportSlugify(title, maxLen) {
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

function buildExportHtml(cardEls, opts, appCss, printCss) {
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
  const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const count = clone.querySelectorAll('.a-card').length;
  const theme = (typeof currentTheme === 'string' && currentTheme) || 'aurora';
  const bgPrint = theme === 'verde' ? '#04130c' : theme === 'mono' ? '#b8b8b8' : '#0c1016';
  const html = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório · Meridian · ${esc(compLabel(_activeCompId))}</title>
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
      <div class="rep-ball">${brandStar()}</div>
      <div>
        <div class="rep-title">MERIDIAN<span class="rep-title-sub">SPORTS INTELLIGENCE</span></div>
        <div class="rep-meta">${esc(compLabel(_activeCompId))} · ${dateStr} · ${count} análise${count !== 1 ? 's' : ''}</div>
      </div>
    </div>
  </div>
  ${clone.innerHTML}
  <div class="rep-disc">Análise estatística baseada em modelo de Poisson e dados reais · não é recomendação financeira · Meridian</div>
</div>
</body>
</html>`;
  return { html, now, count, theme };
}

function _exportFileSlug(cardEls, opts, now) {
  const slug =
    opts.single && cardEls[0]
      ? exportSlugify(cardEls[0].querySelector('.a-title')?.textContent || 'analise')
      : 'relatorio';
  const compSlug = exportSlugify(compLabel(_activeCompId) || 'meridian', 24);
  return `meridian-${compSlug}-${slug}-${now.toISOString().slice(0, 10)}`;
}

let _html2pdfPromise = null;
function _ensureHtml2Pdf() {
  if (typeof window !== 'undefined' && window.html2pdf) return Promise.resolve(window.html2pdf);
  if (_html2pdfPromise) return _html2pdfPromise;
  _html2pdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    // Lib local (offline-first) — sem CDN
    s.src = 'assets/vendor/html2pdf.bundle.min.js';
    s.async = true;
    s.onload = () =>
      window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf missing'));
    s.onerror = () => reject(new Error('html2pdf local load failed'));
    document.head.appendChild(s);
  }).catch((err) => {
    _html2pdfPromise = null;
    throw err;
  });
  return _html2pdfPromise;
}

async function _downloadPdfOneClick(html, baseName) {
  const h2p = await _ensureHtml2Pdf();
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#0c1016;z-index:-1;opacity:0;pointer-events:none;';
  document.body.appendChild(host);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:794px;min-height:1123px;border:0;';
  host.appendChild(iframe);
  const idoc = iframe.contentDocument || iframe.contentWindow.document;
  idoc.open();
  idoc.write(html);
  idoc.close();
  try {
    if (idoc.fonts && idoc.fonts.ready) await idoc.fonts.ready.catch(() => {});
  } catch (_) {}
  await new Promise((r) => {
    if (iframe.contentWindow) iframe.contentWindow.onload = r;
    setTimeout(r, 200);
  });
  try {
    await h2p()
      .set({
        margin: [8, 8, 10, 8],
        filename: baseName + '.pdf',
        image: { type: 'jpeg', quality: 0.93 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0c1016',
          windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.a-card', '.tab-s', '.ticket', '.ev-row'] },
      })
      .from(idoc.body)
      .save();
    toast('PDF baixado.');
  } finally {
    try {
      host.remove();
    } catch (_) {}
  }
}

function _exportCardsWithCss(cardEls, opts, appCss, printCss) {
  opts = opts || {};
  const built = buildExportHtml(cardEls, opts, appCss, printCss);
  const { html, now } = built;
  const baseName = _exportFileSlug(cardEls, opts, now);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (opts.format === 'pdf') {
    toast('Gerando PDF…');
    _downloadPdfOneClick(html, baseName)
      .catch((err) => {
        console.warn('PDF one-click failed, HTML fallback', err);
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + '.html';
        a.click();
        toast('PDF indisponível — baixei HTML. Abra e use Ctrl+P → Salvar como PDF.');
      })
      .finally(() => setTimeout(() => URL.revokeObjectURL(url), 120000));
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = baseName + '.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('HTML baixado.');
}

if (typeof window !== 'undefined') {
  window.exportReport = exportReport;
  window.exportSingle = exportSingle;
  window.toggleExportMenu = toggleExportMenu;
  window.exportCards = exportCards;
  window.buildExportHtml = buildExportHtml;
  window.exportSlugify = exportSlugify;
}
