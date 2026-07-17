/* js/export/report.js — export HTML/PDF (depende de esc, toast, t, brandStar, compLabel, currentTheme, ensureRendered, _activeCompId em runtime) */
// ─── Export ───────────────────────────────────────────────────────────────
/** format: 'html' (download .html) | 'pdf' (abre janela + diálogo Salvar como PDF) */
function exportReport(format){
  const cards=[...document.querySelectorAll('#conversation .a-card')];
  if(!cards.length){
    document.getElementById('error-box').style.display='block';
    document.getElementById('error-msg').textContent='Nenhuma análise para exportar. Faça ao menos uma análise primeiro.';
    toast(t('export_none')||'Nenhuma análise para exportar.');
    return;
  }
  const mode=(format==='pdf'||format==='html')?format:'html';
  exportCards(cards,{format:mode});
}
function exportSingle(hid,format){
  const card=ensureRendered(hid);
  if(card)exportCards([card],{single:true,format:format==='pdf'?'pdf':'html'});
}
function toggleExportMenu(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const pop=document.getElementById('export-pop');
  if(!pop)return;
  const open=pop.style.display==='block';
  pop.style.display=open?'none':'block';
  pop.setAttribute('aria-hidden',open?'true':'false');
  if(!open){
    const close=(ev)=>{
      if(ev.target.closest&&(ev.target.closest('#export-pop')||ev.target.closest('#export-menu-btn')))return;
      pop.style.display='none';pop.setAttribute('aria-hidden','true');
      document.removeEventListener('click',close,true);
    };
    setTimeout(()=>document.addEventListener('click',close,true),0);
  }
}
// Cache app.css + print-report.css (sem app.css o PDF sai “colado”).
let _exportAppCssCache=null,_exportPrintCssCache=null;
async function _loadExportAppCss(){
  if(_exportAppCssCache!=null)return _exportAppCssCache;
  try{
    const href=(document.querySelector('link[rel="stylesheet"][href*="app.css"]')||{}).href
      ||('css/app.css?v='+Date.now());
    const r=await fetch(href,{cache:'force-cache'});
    if(r.ok)_exportAppCssCache=await r.text();
    else _exportAppCssCache='';
  }catch{_exportAppCssCache='';}
  return _exportAppCssCache;
}
async function _loadExportPrintCss(){
  if(_exportPrintCssCache!=null)return _exportPrintCssCache;
  try{
    const r=await fetch('css/print-report.css?v='+Date.now(),{cache:'force-cache'});
    if(r.ok)_exportPrintCssCache=await r.text();
    else _exportPrintCssCache='';
  }catch{_exportPrintCssCache='';}
  return _exportPrintCssCache;
}
function exportCards(cardEls,opts){
  opts=opts||{};
  Promise.all([_loadExportAppCss(),_loadExportPrintCss()]).then(([appCss,printCss])=>{
    try{_exportCardsWithCss(cardEls,opts,appCss||'',printCss||'');}
    catch(e){console.error(e);toast('Falha ao montar o relatório. Tente de novo.');}
  });
}
function _exportCardsWithCss(cardEls,opts,appCss,printCss){
  opts=opts||{};
  const clone=document.createElement('div');
  cardEls.forEach(c=>clone.appendChild(c.cloneNode(true)));
  clone.querySelectorAll('.a-card').forEach(card=>{
    card.querySelectorAll('.a-ic,.a-status,.a-hdr,.disc,.a-tab-pill').forEach(b=>b.remove());
    const tcs=card.querySelectorAll('.a-tc'),btns=card.querySelectorAll('.a-tab');
    tcs.forEach((tc,i)=>{
      // Expandir TODAS as abas no HTML exportado (não depender só de @media print)
      tc.style.display='block';
      const h=document.createElement('div');
      h.className='print-tabname';
      h.textContent=btns[i]?btns[i].textContent.trim():('Seção '+(i+1));
      tc.insertBefore(h,tc.firstChild);
    });
    // Barras de probabilidade: clone pode ter ficado em scaleX(0) se a animação não rodou
    card.querySelectorAll('.bfill[data-w],.ev-bar-fill[data-w]').forEach(b=>{
      const w=Number(b.getAttribute('data-w')||b.dataset.w||0);
      b.style.transform='scaleX('+(Math.max(0,Math.min(100,w))/100)+')';
    });
  });
  // CSS do <style> inline (tema flash etc.) + app.css completo + overrides do relatório
  const inlineCss=[...document.querySelectorAll('style')].map(s=>s.textContent).filter(Boolean).join('\n\n');
  const now=new Date();
  const dateStr=now.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  const count=clone.querySelectorAll('.a-card').length;
  const theme=(typeof currentTheme==='string'&&currentTheme)||'aurora';
  const bgPrint=theme==='verde'?'#04130c':(theme==='mono'?'#b8b8b8':'#0c1016');
  const html=`<!DOCTYPE html>
<html lang="pt-BR" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório · Meridian · ${esc(compLabel(_activeCompId))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ── app.css embutido ── */
${appCss}
/* ── styles inline da app ── */
${inlineCss}
/* ── print-report.css (camada canônica de impressão) ── */
${printCss||''}
html,body{background:${bgPrint}!important}
</style>
</head>
<body class="printing">
<div class="rep-wrap">
  <div class="rep-head">
    <div class="rep-brand">
      <div class="rep-ball">${brandStar()}</div>
      <div>
        <div class="rep-title">MERIDIAN<span class="rep-title-sub">SPORTS INTELLIGENCE</span></div>
        <div class="rep-meta">${esc(compLabel(_activeCompId))} · ${dateStr} · ${count} análise${count!==1?'s':''}</div>
      </div>
    </div>
    <div class="rep-actions no-print">
      <button type="button" class="rep-print rep-print-pdf" onclick="doPrint()">↓ Salvar como PDF</button>
      <span class="rep-print-hint">Na impressão, escolha destino <b>Salvar como PDF</b> (Edge/Chrome) ou <b>Microsoft Print to PDF</b>.</span>
    </div>
  </div>
  ${clone.innerHTML}
  <div class="rep-disc">Análise estatística baseada em modelo de Poisson e dados reais · não é recomendação financeira · Meridian</div>
</div>
<script>
function doPrint(){document.body.classList.add('printing');setTimeout(function(){window.print();},40);}
window.addEventListener('afterprint',function(){/* mantém expanded */});
// Se abriu via botão PDF do app (?pdf=1), dispara o diálogo uma vez
try{
  if(/[?&]pdf=1(?:&|$)/.test(location.search||'')||document.body.getAttribute('data-auto-pdf')==='1'){
    setTimeout(doPrint,400);
  }
}catch(e){}
<\/script>
</body>
</html>`;
  const b=new Blob([html],{type:'text/html;charset=utf-8'});
  const u=URL.createObjectURL(b);
  const slug=opts.single&&cardEls[0]?((cardEls[0].querySelector('.a-title')?.textContent||'analise').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40)||'analise'):'relatorio';
  const compSlug=(compLabel(_activeCompId)||'meridian').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,24)||'meridian';
  const baseName=`meridian-${compSlug}-${slug}-${now.toISOString().slice(0,10)}`;
  const asPdf=opts.format==='pdf'||opts.pdf===true;

  if(asPdf){
    // Abre com document.write + data-auto-pdf (dispara print → Salvar como PDF).
    const w=window.open('','_blank');
    if(!w){
      const a=document.createElement('a');
      a.href=u;a.download=baseName+'.html';a.click();
      toast('Permita pop-ups para PDF, ou abra o HTML e use Ctrl+P → Salvar como PDF.');
      setTimeout(()=>URL.revokeObjectURL(u),60_000);
      return;
    }
    try{
      w.document.open();
      // Reusa o mesmo HTML com atributo de auto-PDF
      w.document.write(html.replace('<body class="printing">','<body class="printing" data-auto-pdf="1">'));
      w.document.close();
      w.document.title=baseName;
    }catch(err){
      // Fallback: navega para o blob
      try{w.location=u;}catch(_){}
      setTimeout(()=>{try{w.print();}catch(_){}},600);
    }
    toast('Na janela de impressão: destino “Salvar como PDF” (ou Microsoft Print to PDF).');
    setTimeout(()=>URL.revokeObjectURL(u),120_000);
    return;
  }

  // HTML: download do arquivo
  const a=document.createElement('a');
  a.href=u;a.download=baseName+'.html';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(u),30_000);
  toast('HTML baixado. Para PDF: use o botão PDF no app ou Ctrl+P no arquivo.');
}


