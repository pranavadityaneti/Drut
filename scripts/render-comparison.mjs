#!/usr/bin/env node
/**
 * Render a FRESH (new pipeline) vs LEGACY (current bank) comparison for one chapter,
 * so the quality/format difference is visible side by side.
 *   fresh  = scripts/generate-chapter-output.json (new format: quickMethod + fullSolution)
 *   legacy = scripts/legacy-lom-sample.json        (old format: flat fullStepByStep, all-Medium)
 * Usage: node scripts/render-comparison.mjs <out.html> "<title>"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const [, , outPath = join(__dirname, '../docs/fresh-vs-legacy.html'), title = 'Drut — Fresh vs Legacy (Laws of Motion)'] = process.argv;

const fresh = JSON.parse(readFileSync(join(__dirname, 'generate-chapter-output.json'), 'utf8')).results.filter(r => r.json && (!r.auditFails || !r.auditFails.length));
const legacy = JSON.parse(readFileSync(join(__dirname, 'legacy-lom-sample.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const L = ['A', 'B', 'C', 'D'];

function opts(q) {
  return (q.options || []).map((o, k) => `<li class="opt${k === q.correctOptionIndex ? ' c' : ''}"><b>${L[k]}</b> ${md(o.text)}${k === q.correctOptionIndex ? ' ✓' : ''}</li>`).join('');
}
function freshCard(r, i) {
  const q = r.json, fs = q.fullSolution || {};
  return `<div class="card fresh"><div class="h"><span class="n">F${i + 1}</span><span class="d d-${esc(r.difficulty)}">${esc(r.difficulty)}</span></div>
    <div class="q">${md(q.questionText)}</div><ol class="o">${opts(q)}</ol>
    <div class="lab">⚡ Quick Method</div><ol class="qm">${(q.quickMethod?.steps || []).map(s => `<li>${md(s)}</li>`).join('')}</ol>
    <div class="lab">🔬 Full Solution</div><div class="ap">${md(fs.approach)}</div>
    <div class="steps">${(fs.steps || []).map(c => `<div>${md(c.text)}${c.display ? `<div class="disp">$$${c.display}$$</div>` : ''}</div>`).join('')}</div>
    <div class="ans">${md(fs.answer)}</div></div>`;
}
function legacyCard(r, i) {
  const q = r.json || {};
  const steps = (q.fullStepByStep?.steps || []).map(s => `<li>${md(typeof s === 'string' ? s : s.text || JSON.stringify(s))}</li>`).join('');
  return `<div class="card legacy"><div class="h"><span class="n">L${i + 1}</span><span class="d d-${esc(r.task.difficulty)}">${esc(r.task.difficulty)}</span></div>
    <div class="q">${md(q.questionText)}</div><ol class="o">${opts(q)}</ol>
    <div class="lab">⚡ Quick Method</div><div class="none">— none (legacy questions have no quick method)</div>
    <div class="lab">Step-by-step (old flat format)</div><ol class="qm">${steps || '<li class="none">none</li>'}</ol></div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});"></script>
<style>
 :root{--green:#b4fa8d;--ink:#0f1a14;--muted:#5b6b62;--line:#e3e8e4;--accent:#1f7a4d}
 *{box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;color:var(--ink);background:#fafcfa;margin:0;line-height:1.55}
 .wrap{max-width:1500px;margin:0 auto;padding:24px}
 h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);font-size:13px;margin-bottom:18px}
 .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
 .colh{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:8px 12px;border-radius:8px;margin-bottom:10px}
 .colh.f{background:rgba(180,250,141,.3);color:var(--accent)}.colh.l{background:#fdeaea;color:#b3261e}
 .card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:14px;font-size:13.5px}
 .card.fresh{border-left:3px solid var(--accent)}.card.legacy{border-left:3px solid #b3261e}
 .h{display:flex;gap:8px;align-items:center;margin-bottom:8px}.n{font-weight:700;background:var(--ink);color:#fff;border-radius:6px;padding:1px 8px;font-size:12px}
 .d{margin-left:auto;font-size:11px;font-weight:700;border-radius:999px;padding:1px 9px}
 .d-Easy{background:#e9f9e2;color:#2f7d20}.d-Medium{background:#fff5e0;color:#9a6b00}.d-Hard{background:#fdeaea;color:#b3261e}
 .q{font-size:14px;margin-bottom:8px}ol.o{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:4px}
 .opt{border:1px solid var(--line);border-radius:7px;padding:5px 8px}.opt.c{border-color:var(--accent);background:rgba(180,250,141,.16)}
 .lab{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin:8px 0 4px}
 ol.qm{margin:0;padding-left:18px;display:grid;gap:3px}.ap{font-style:italic;color:#27332c;margin-bottom:6px}
 .steps{display:grid;gap:6px}.disp{text-align:center;margin:3px 0}.ans{margin-top:8px;font-weight:600;background:var(--ink);color:#fff;border-radius:7px;padding:6px 10px}.ans .g{color:var(--green)}
 .none{color:#b3261e;font-style:italic}
 @media print{body{background:#fff}}
</style></head><body><div class="wrap">
<h1>${esc(title)}</h1>
<div class="sub">${fresh.length} fresh (gpt-5.4-mini @ high, BIEAP-grounded, new format, balanced difficulty) vs ${legacy.length} legacy (v3-verified-rag, old flat format, all-Medium).</div>
<div class="cols">
  <div><div class="colh f">✅ FRESH — new pipeline</div>${fresh.map(freshCard).join('')}</div>
  <div><div class="colh l">❌ LEGACY — current bank</div>${legacy.map(legacyCard).join('')}</div>
</div></div></body></html>`;
writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${fresh.length} fresh, ${legacy.length} legacy)`);
