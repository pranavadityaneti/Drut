#!/usr/bin/env node
/**
 * Render the revised-format calibration JSON into a readable HTML doc
 * (clean Quick Method + concept-led flowing B+C-mix Full Solution).
 *
 * Usage: node scripts/render-format-html.mjs <input.json> <output.html> "<title>"
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, titleArg] = process.argv;
const TITLE = titleArg || 'Drut — Revised-Format Questions';
const data = JSON.parse(readFileSync(inPath, 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const LETTERS = ['A', 'B', 'C', 'D'];

function chunkHtml(c) {
  const disp = c && typeof c.display === 'string' && c.display.trim()
    ? `<div class="disp">$$${c.display}$$</div>` : '';
  return `<div class="chunk"><span class="det">${md(c?.text)}</span>${disp}</div>`;
}

function card(r, i) {
  const q = r.json;
  if (!q) return `<section class="card err" id="q${i + 1}"><div class="qhead"><span class="qnum">Q${i + 1}</span><span class="meta">${esc(r.task?.subject)} · ${esc(r.task?.subtopic)}</span></div><p class="bad">No valid JSON produced.</p></section>`;
  const t = r.task || {};
  const opts = (q.options || []).map((o, k) =>
    `<li class="opt${k === q.correctOptionIndex ? ' correct' : ''}"><span class="lett">${LETTERS[k]}</span><span>${md(typeof o === 'string' ? o : (o?.text ?? o?.en ?? ''))}</span>${k === q.correctOptionIndex ? '<span class="tick">✓</span>' : ''}</li>`
  ).join('');
  const quick = (q.quickMethod?.steps || []).map((s) => `<li>${md(s)}</li>`).join('');
  const fs2 = q.fullSolution || {};
  const chunks = (fs2.steps || []).map(chunkHtml).join('');
  return `<section class="card" id="q${i + 1}">
    <div class="qhead"><span class="qnum">Q${i + 1}</span><span class="meta">${esc(t.subject)} · ${esc(t.chapter || '')} · ${esc(t.subtopic)}</span><span class="diff diff-${esc(t.difficulty)}">${esc(t.difficulty)}</span></div>
    <div class="qtext">${md(q.questionText)}</div>
    <ol class="opts">${opts}</ol>
    <div class="block"><div class="blab">⚡ Quick Method</div><ol class="quick">${quick}</ol></div>
    <div class="block"><div class="blab">🔬 Full Solution <span class="cnt">${(fs2.steps || []).length} steps</span></div>
      ${fs2.approach ? `<div class="approach">${md(fs2.approach)}</div>` : ''}
      <div class="chunks">${chunks}</div>
      ${fs2.answer ? `<div class="answer">Answer: <span class="g">${md(fs2.answer)}</span></div>` : ''}
    </div>
  </section>`;
}

const cards = data.map(card).join('\n');
const toc = data.map((r, i) => `<li><a href="#q${i + 1}">Q${i + 1} — ${esc(r.task?.subject)} (${esc(r.task?.difficulty)}): ${esc(r.task?.subtopic)}</a></li>`).join('');

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});"></script>
<style>
 :root{--green:#b4fa8d;--ink:#0f1a14;--muted:#5b6b62;--line:#e3e8e4;--bg:#fafcfa;--accent:#1f7a4d}
 *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);margin:0;line-height:1.62}
 .wrap{max-width:840px;margin:0 auto;padding:30px 20px 80px}
 header.doc{border-bottom:3px solid var(--green);padding-bottom:16px;margin-bottom:22px}
 header.doc h1{margin:0 0 6px;font-size:24px} header.doc .sub{color:var(--muted);font-size:13px}
 .toc{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin-bottom:26px}
 .toc h2{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
 .toc ol{margin:0;padding-left:18px;font-size:13px} .toc a{color:var(--accent);text-decoration:none}
 .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-bottom:20px}
 .qhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
 .qnum{background:var(--ink);color:var(--green);font-weight:700;border-radius:8px;padding:2px 10px;font-size:14px}
 .meta{color:var(--muted);font-size:13px;font-weight:600}
 .diff{margin-left:auto;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;border:1px solid var(--line)}
 .diff-Hard{background:#fdeaea;color:#b3261e;border-color:#f3c0bc} .diff-Medium{background:#fff5e0;color:#9a6b00;border-color:#f0dca5} .diff-Easy{background:#e9f9e2;color:#2f7d20;border-color:#c4ebb4}
 .qtext{font-size:16.5px;margin-bottom:14px}
 ol.opts{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:7px}
 .opt{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:15px}
 .opt.correct{border-color:var(--accent);background:rgba(180,250,141,.18)}
 .lett{font-weight:700;color:var(--muted)} .opt.correct .lett{color:var(--accent)} .tick{margin-left:auto;color:var(--accent);font-weight:700;font-size:12px}
 .block{margin-top:16px}
 .blab{font-size:14px;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}
 .cnt{margin-left:auto;font-size:11px;font-weight:600;color:var(--muted)}
 ol.quick{margin:0;padding-left:20px;display:grid;gap:7px;font-size:15px}
 .approach{background:#f4f8f5;border-left:3px solid var(--green);border-radius:6px;padding:10px 14px;font-size:14.5px;margin-bottom:12px}
 .chunks{display:grid;gap:13px;font-size:14.5px} .chunk .det{color:#27332c} .chunk .disp{margin:7px 0 0;text-align:center}
 .answer{margin-top:15px;background:var(--ink);color:#fff;border-radius:10px;padding:10px 14px;font-weight:600;font-size:15px} .answer .g{color:var(--green)}
 .err{border-color:#f3c0bc;background:#fdf3f2} .bad{color:#b3261e;font-weight:600}
 @media print{body{background:#fff}.card,.toc{break-inside:avoid}}
</style></head><body><div class="wrap">
<header class="doc"><h1>${esc(TITLE)}</h1><div class="sub">${data.length} questions · gpt-5.4-mini @ high · B+C mix, no worked examples</div></header>
<nav class="toc"><h2>Contents</h2><ol>${toc}</ol></nav>
${cards}
</div></body></html>`;
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
