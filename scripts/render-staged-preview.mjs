#!/usr/bin/env node
/**
 * Render the accepted (audit+verify-passed) questions from a generate-chapter run
 * into a self-contained HTML preview — full new-format render plus the independent
 * verifier's verdict per question, so the batch can be reviewed outside the app.
 *
 * Reads:  scripts/generate-chapter-output.json
 * Writes: docs/<out>.html  (default docs/staged-lom-9-preview.html)
 * Run:    node scripts/render-staged-preview.mjs [out.html] ["Title"]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const [, , outName = 'staged-lom-9-preview.html', title = 'Drut — Staged Pilot (Laws of Motion, audit+verify)'] = process.argv;
const outPath = join(__dirname, '../docs', outName);

const run = JSON.parse(readFileSync(join(__dirname, 'generate-chapter-output.json'), 'utf8'));
const accepted = (run.results || []).filter(r => r.json && (!r.auditFails || !r.auditFails.length) && (!r.verdict || r.verdict.ok));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const L = ['A', 'B', 'C', 'D'];

function card(r, i) {
  const q = r.json, fs = q.fullSolution || {}, v = r.verify || {};
  const verdict = r.verdict || {};
  const conf = verdict.confidence || v.confidence || '';
  const opts = (q.options || []).map((o, k) =>
    `<li class="opt${k === q.correctOptionIndex ? ' c' : ''}"><b>${L[k]}</b> ${md(o.text)}${k === q.correctOptionIndex ? ' ✓' : ''}</li>`).join('');
  const steps = (fs.steps || []).map(c => `<div class="schunk">${md(c.text)}${c.display ? `<div class="disp">$$${c.display}$$</div>` : ''}</div>`).join('');
  const distract = (q.distractorRationale || []).map((d, k) => `<li><b>${L[k]}</b> ${md(d)}</li>`).join('');
  return `<div class="card">
    <div class="h"><span class="n">Q${i + 1}</span><span class="d d-${esc(r.difficulty)}">${esc(r.difficulty)}</span>
      <span class="verify">🔁 verifier: ${v.answerIndex === q.correctOptionIndex ? 'agrees ' + L[v.answerIndex] : 'idx ' + v.answerIndex} · ${esc(conf)} conf</span></div>
    <div class="q">${md(q.questionText)}</div>
    <ol class="o">${opts}</ol>
    <div class="lab">⚡ Quick Method</div>
    <ol class="qm">${(q.quickMethod?.steps || []).map(s => `<li>${md(s)}</li>`).join('')}</ol>
    <div class="lab">🔬 Full Solution</div>
    <div class="ap">${md(fs.approach)}</div>
    <div class="steps">${steps}</div>
    <div class="ans">${md(fs.answer)}</div>
    <details class="dr"><summary>Distractor rationale</summary><ol class="o2">${distract}</ol></details>
  </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});"></script>
<style>
 :root{--green:#b4fa8d;--ink:#0f1a14;--muted:#5b6b62;--line:#e3e8e4;--accent:#1f7a4d}
 *{box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;color:var(--ink);background:#fafcfa;margin:0;line-height:1.6}
 .wrap{max-width:860px;margin:0 auto;padding:28px}
 h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);font-size:13px;margin-bottom:22px}
 .card{background:#fff;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:12px;padding:18px 20px;margin-bottom:18px}
 .h{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
 .n{font-weight:700;background:var(--ink);color:#fff;border-radius:6px;padding:2px 9px;font-size:12px}
 .d{font-size:11px;font-weight:700;border-radius:999px;padding:2px 10px}
 .d-Easy{background:#e9f9e2;color:#2f7d20}.d-Medium{background:#fff5e0;color:#9a6b00}.d-Hard{background:#fdeaea;color:#b3261e}
 .verify{margin-left:auto;font-size:11px;font-weight:600;color:var(--accent);background:rgba(180,250,141,.22);border-radius:999px;padding:2px 10px}
 .q{font-size:15.5px;font-weight:500;margin-bottom:12px}
 ol.o{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:5px}
 .opt{border:1px solid var(--line);border-radius:8px;padding:7px 11px;font-size:14px}.opt.c{border-color:var(--accent);background:rgba(180,250,141,.16);font-weight:600}
 .lab{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px}
 ol.qm{margin:0;padding-left:20px;display:grid;gap:5px;font-size:14px}
 .ap{font-style:italic;color:#27332c;margin-bottom:8px}
 .steps{display:grid;gap:8px;font-size:14px}.schunk{}.disp{text-align:center;margin:4px 0}
 .ans{margin-top:10px;font-weight:600;background:var(--ink);color:#fff;border-radius:8px;padding:8px 12px;font-size:14px}
 .dr{margin-top:10px;font-size:13px;color:var(--muted)}.dr summary{cursor:pointer;font-weight:600}
 ol.o2{margin:6px 0 0;padding-left:18px;display:grid;gap:3px}
 @media print{body{background:#fff}.card{break-inside:avoid}}
</style></head><body><div class="wrap">
<h1>${esc(title)}</h1>
<div class="sub">${accepted.length} questions · gpt-5.4-mini @ high · RAG-grounded (BIEAP) · each independently re-solved by the verify gate (shown per card). All staged as <code>ai-openai-staged</code> — not served until you approve in AI Review.</div>
${accepted.map(card).join('')}
</div></body></html>`;
writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${accepted.length} accepted questions)`);
