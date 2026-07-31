/**
 * Empacotador do Motor Meridian — node tools/package-motor.mjs
 *
 * Gera motor-meridian.zip a partir do motor/MANIFEST.txt com SANITIZAÇÃO para o
 * cliente (shell 122+): o repositório mantém os comentários internos (histórico
 * de decisões, "dono", "pacote vendável" — valiosos para manutenção AQUI), mas o
 * zip entregue sai neutro. A sanitização é determinística e AUDITADA: depois de
 * aplicar, o script varre o staging e ABORTA se sobrar qualquer termo interno.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(import.meta.dirname, '..');
const STAGING = path.join(ROOT, '_pkg_staging');
const ZIP = path.join(ROOT, 'motor-meridian.zip');

// ── substituições exatas (comentários apenas — nunca tocam código executável) ──
const SUBS = [
  [/a pedido do dono/g, 'por decisão de produto'],
  [/acesso do dono/g, 'acesso da API'],
  [/\bdo dono\b/g, 'de produto'],           // fallback p/ variantes restantes
  [/\s*\bvendáve(l|is)\b/g, ''],            // "motor vendável"/"pacote vendável" → sem o adjetivo
  [/\bcomprador(es)?\b/g, 'integrador'],
];
// ── versão: fonte única é MOTOR_VERSION no engine; MANIFEST e CHANGELOG derivam ──
// Sem carimbo, o integrador não sabe qual build tem e nós não temos como dizer
// "atualize, sua versão tem probabilidade errada em mercado de cartão".
const engineSrc = fs.readFileSync(path.join(ROOT, 'motor/engine.mjs'), 'utf8');
const mVer = engineSrc.match(/export const MOTOR_VERSION = '([^']+)'/);
if (!mVer) {
  console.error('engine.mjs não exporta MOTOR_VERSION — aborta (pacote sem versão é o problema que isto resolve).');
  process.exit(1);
}
const VERSION = mVer[1];
// o CHANGELOG precisa documentar ESTA versão no topo — senão o cliente recebe um
// carimbo sem a nota do que mudou, que é metade do valor.
const changelog = fs.readFileSync(path.join(ROOT, 'motor/CHANGELOG.md'), 'utf8');
const mTop = changelog.match(/^## (\d+\.\d+\.\d+)/m);
if (!mTop || mTop[1] !== VERSION) {
  console.error(`CHANGELOG desatualizado — engine diz ${VERSION}, topo do changelog diz ${mTop ? mTop[1] : '(nenhuma)'}. Aborta.`);
  process.exit(1);
}

// cabeçalho do MANIFEST reescrito por inteiro (versão para o cliente)
const MANIFEST_HEADER = [
  `# Motor Meridian ${VERSION} — conteúdo do pacote (lista exata de arquivos).`,
  '# Mudanças desta versão: motor/CHANGELOG.md',
  '# tests/motor.mjs valida que todos existem: node tests/motor.mjs',
].join('\n');
// termos que NÃO podem existir no pacote entregue (auditoria pós-sanitização)
const FORBIDDEN = /vendável|venda do motor|vendedor|comprador|\bdo dono\b|handoff mestre|roteiro da sessão/i;

const manifest = fs.readFileSync(path.join(ROOT, 'motor/MANIFEST.txt'), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

fs.rmSync(STAGING, { recursive: true, force: true });
let sanitized = 0;
for (const rel of manifest) {
  const src = path.join(ROOT, rel);
  const dst = path.join(STAGING, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let body = fs.readFileSync(src, 'utf8');
  if (rel === 'motor/MANIFEST.txt') {
    body = MANIFEST_HEADER + '\n' + manifest.join('\n') + '\n';
    sanitized++;
  } else {
    const before = body;
    for (const [re, b] of SUBS) body = body.replace(re, b);
    if (body !== before) sanitized++;
  }
  fs.writeFileSync(dst, body);
}

// auditoria: nenhum termo interno pode sobrar no staging
const leaks = [];
for (const rel of manifest) {
  const body = fs.readFileSync(path.join(STAGING, rel), 'utf8');
  const m = body.match(FORBIDDEN);
  if (m) leaks.push(rel + ': "' + m[0] + '"');
}
if (leaks.length) {
  console.error('VAZAMENTO no pacote — aborta:\n' + leaks.join('\n'));
  process.exit(1);
}

fs.rmSync(ZIP, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command',
  `Compress-Archive -Path "${STAGING}\\*" -DestinationPath "${ZIP}"`]);
fs.rmSync(STAGING, { recursive: true, force: true });
const kb = (fs.statSync(ZIP).size / 1024).toFixed(1);
console.log(`OK: Motor ${VERSION} · ${manifest.length} arquivos · ${sanitized} sanitizados · ${kb} KB · zero vazamentos`);
