#!/usr/bin/env node
/**
 * Render a calibration-output JSON file into a readable, self-contained HTML doc.
 * Shows: question, MCQ options (correct marked), Quick Method (T.A.R.),
 * Full Solution (D.E.E.P.), and the SVG diagram if present.
 *
 * Math renders via KaTeX (CDN auto-render) — the one external dependency, needed
 * only to typeset the LaTeX; the file is otherwise self-contained.
 *
 * Usage: node scripts/render-questions-html.mjs <input.json> <output.html> "<title>"
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, titleArg] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node scripts/render-questions-html.mjs <input.json> <output.html> "<title>"');
  process.exit(1);
}
const TITLE = titleArg || 'Drut — Generated Questions';
const data = JSON.parse(readFileSync(inPath, 'utf8'));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// minimal markdown: escape HTML first, then re-introduce <strong> and line breaks
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\n/g, '<br>');

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function card(r, i) {
  const q = r.json;
  if (!q) {
    return `<section class="card err"><h2>Q${i + 1} — ${esc(r.task?.subject)} · ${esc(r.task?.subtopic)}</h2>
      <p class="bad">No valid JSON was produced for this question.</p></section>`;
  }
  const t = r.task || {};
  const correct = q.correctOptionIndex;
  const opts = (q.options || []).map((o, k) => {
    const isC = k === correct;
    return `<li class="opt${isC ? ' correct' : ''}"><span class="lett">${LETTERS[k]}</span>
      <span class="otext">${md(o.text)}</span>${isC ? '<span class="tick">✓ correct</span>' : ''}</li>`;
  }).join('');

  const tar = (q.theOptimalPath?.steps || []).map((s) => `<li>${md(s)}</li>`).join('');
  const deep = (q.fullStepByStep?.phases || []).map((p) =>
    `<div class="phase"><div class="plabel">${esc(p.label)}</div><div class="pcontent">${md(p.content)}</div></div>`
  ).join('');

  const diagram = q.diagram?.svg && q.diagram.svg.includes('<svg')
    ? `<div class="diagram"><div class="figwrap">${q.diagram.svg}</div>
       ${q.diagram.caption ? `<div class="caption">Fig: ${md(q.diagram.caption)}</div>` : ''}</div>`
    : '';

  return `<section class="card" id="q${i + 1}">
    <div class="qhead">
      <span class="qnum">Q${i + 1}</span>
      <span class="meta">${esc(t.subject)} · ${esc(t.chapter || '')} · ${esc(t.subtopic)}</span>
      <span class="diff diff-${esc(t.difficulty)}">${esc(t.difficulty)}</span>
    </div>
    <div class="qtext">${md(q.questionText)}</div>
    ${diagram}
    <ol class="opts">${opts}</ol>
    ${q.conceptNote ? `<div class="concept"><span class="tag">Concept</span> ${md(q.conceptNote)}</div>` : ''}
    <div class="sol">
      <div class="solcol">
        <h3>⚡ Quick Method <span class="sub">(T.A.R.)</span></h3>
        <ol class="tar">${tar}</ol>
      </div>
      <div class="solcol">
        <h3>🔬 Full Solution <span class="sub">(D.E.E.P.)</span></h3>
        <div class="deep">${deep}</div>
      </div>
    </div>
  </section>`;
}

const cards = data.map(card).join('\n');
const tocItems = data.map((r, i) => {
  const t = r.task || {};
  return `<li><a href="#q${i + 1}">Q${i + 1} — ${esc(t.subject)}: ${esc(t.subtopic)}</a></li>`;
}).join('');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});"></script>
<style>
  :root{ --green:#b4fa8d; --ink:#0f1a14; --muted:#5b6b62; --line:#e3e8e4; --bg:#fafcfa; --card:#fff; --accent:#1f7a4d; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);margin:0;line-height:1.55}
  .wrap{max-width:920px;margin:0 auto;padding:32px 20px 80px}
  header.doc{border-bottom:3px solid var(--green);padding-bottom:16px;margin-bottom:24px}
  header.doc h1{margin:0 0 6px;font-size:26px}
  header.doc .sub{color:var(--muted);font-size:14px}
  .toc{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin-bottom:28px}
  .toc h2{margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .toc ol{margin:0;padding-left:20px;columns:2;font-size:13px}
  .toc a{color:var(--accent);text-decoration:none}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-bottom:22px;box-shadow:0 1px 2px rgba(0,0,0,.03)}
  .qhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .qnum{background:var(--ink);color:var(--green);font-weight:700;border-radius:8px;padding:2px 10px;font-size:14px}
  .meta{color:var(--muted);font-size:13px;font-weight:600}
  .diff{margin-left:auto;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;border:1px solid var(--line)}
  .diff-Hard{background:#fdeaea;color:#b3261e;border-color:#f3c0bc}
  .diff-Medium{background:#fff5e0;color:#9a6b00;border-color:#f0dca5}
  .diff-Easy{background:#e9f9e2;color:#2f7d20;border-color:#c4ebb4}
  .qtext{font-size:17px;margin-bottom:14px}
  .diagram{margin:8px 0 16px;text-align:center}
  .figwrap{display:inline-block;border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff;max-width:100%}
  .figwrap svg{max-width:100%;height:auto}
  .caption{font-size:12px;color:var(--muted);margin-top:6px}
  ol.opts{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px}
  .opt{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line);border-radius:10px;padding:9px 12px;background:#fff}
  .opt.correct{border-color:var(--accent);background:linear-gradient(0deg,rgba(180,250,141,.18),rgba(180,250,141,.18))}
  .lett{font-weight:700;color:var(--muted);min-width:18px}
  .opt.correct .lett{color:var(--accent)}
  .otext{flex:1}
  .tick{font-size:12px;font-weight:700;color:var(--accent);white-space:nowrap}
  .concept{font-size:13px;color:#33433a;background:#f4f8f5;border-left:3px solid var(--green);border-radius:6px;padding:8px 12px;margin-bottom:16px}
  .concept .tag{font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:var(--accent);margin-right:6px}
  .sol{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media(max-width:720px){.sol{grid-template-columns:1fr}.toc ol{columns:1}}
  .solcol h3{font-size:14px;margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  .solcol h3 .sub{color:var(--muted);font-weight:500}
  ol.tar{margin:0;padding-left:18px;font-size:14px;display:grid;gap:6px}
  .deep{display:grid;gap:8px}
  .phase{font-size:13.5px}
  .plabel{font-weight:700;font-size:11px;letter-spacing:.05em;color:var(--accent)}
  .pcontent{color:#22302a}
  .err{border-color:#f3c0bc;background:#fdf3f2}
  .bad{color:#b3261e;font-weight:600}
  @media print{ body{background:#fff} .card,.toc{box-shadow:none;break-inside:avoid} a{color:var(--ink)} }
</style></head>
<body><div class="wrap">
<header class="doc">
  <h1>${esc(TITLE)}</h1>
  <div class="sub">${data.length} questions · generated by gpt-5.4-mini @ high reasoning · Drut calibration</div>
</header>
<nav class="toc"><h2>Contents</h2><ol>${tocItems}</ol></nav>
${cards}
</div></body></html>`;

writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (${data.length} questions)`);
