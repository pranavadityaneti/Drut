#!/usr/bin/env node
/**
 * Build a self-contained HTML gallery of the figure-dependent questions:
 * question + inline SVG diagram + options/answer + the diagram-audit verdict.
 *
 * Usage: node scripts/render-diagram-gallery.mjs <questions.json> <audit.json> <out.html> "<title>"
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , qPath, aPath, outPath, titleArg] = process.argv;
const TITLE = titleArg || 'Drut — Diagram Calibration';
const data = JSON.parse(readFileSync(qPath, 'utf8'));
const audit = JSON.parse(readFileSync(aPath, 'utf8'));
const byIndex = {};
for (const a of audit.perQuestion) byIndex[a.index] = a;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const LETTERS = ['A', 'B', 'C', 'D'];
const VERDICT = {
  'production-ready': { cls: 'v-ok', txt: '✅ Production-ready' },
  'minor-issues': { cls: 'v-min', txt: '⚠️ Minor issues' },
  'defective': { cls: 'v-bad', txt: '❌ Defective' },
};

function card(r, i) {
  const q = r.json; if (!q) return '';
  const t = r.task || {};
  const a = byIndex[i] || {};
  const v = VERDICT[a.verdict] || { cls: '', txt: a.verdict || '—' };
  const opts = (q.options || []).map((o, k) =>
    `<li class="opt${k === q.correctOptionIndex ? ' correct' : ''}"><span class="lett">${LETTERS[k]}</span><span>${md(o.text)}</span>${k === q.correctOptionIndex ? '<span class="tick">✓</span>' : ''}</li>`
  ).join('');
  const chk = (ok) => ok ? '<span class="y">yes</span>' : '<span class="n">NO</span>';
  const defects = (a.defects || []).map((d) =>
    `<li class="def def-${d.severity}"><b>${esc(d.aspect)} / ${esc(d.severity)}:</b> ${esc(d.description)}</li>`
  ).join('');

  return `<section class="card" id="q${i + 1}">
    <div class="qhead">
      <span class="qnum">Q${i + 1}</span>
      <span class="meta">${esc(t.subject)} · ${esc(t.subtopic)}</span>
      <span class="verdict ${v.cls}">${v.txt}</span>
    </div>
    <div class="qtext">${md(q.questionText)}</div>
    <div class="figwrap">${q.diagram?.svg || '<em>no diagram</em>'}</div>
    ${q.diagram?.caption ? `<div class="caption">Fig: ${md(q.diagram.caption)}</div>` : ''}
    <ol class="opts">${opts}</ol>
    <div class="audit">
      <div class="arow"><b>Necessary:</b> ${chk(a.necessary)} · <b>Accurate to problem:</b> ${chk(a.accurate)} · <b>Legible:</b> ${chk(a.legible)} · <b>Answer key correct:</b> ${chk(a.answerKeyAgree)}</div>
      ${a.accuracyNote ? `<div class="anote"><b>Accuracy:</b> ${esc(a.accuracyNote)}</div>` : ''}
      ${a.legibilityNote ? `<div class="anote"><b>Legibility:</b> ${esc(a.legibilityNote)}</div>` : ''}
      ${defects ? `<ul class="defs">${defects}</ul>` : ''}
    </div>
  </section>`;
}

const cards = data.map(card).join('\n');
const tk = audit.tally || {};
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});"></script>
<style>
 :root{--green:#b4fa8d;--ink:#0f1a14;--muted:#5b6b62;--line:#e3e8e4;--bg:#fafcfa;--accent:#1f7a4d}
 *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);margin:0;line-height:1.55}
 .wrap{max-width:900px;margin:0 auto;padding:32px 20px 80px}
 header.doc{border-bottom:3px solid var(--green);padding-bottom:16px;margin-bottom:20px}
 header.doc h1{margin:0 0 6px;font-size:24px}
 .summary{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin-bottom:24px;font-size:14px}
 .summary b{color:var(--accent)}
 .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin-bottom:20px}
 .qhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
 .qnum{background:var(--ink);color:var(--green);font-weight:700;border-radius:8px;padding:2px 10px;font-size:14px}
 .meta{color:var(--muted);font-size:13px;font-weight:600}
 .verdict{margin-left:auto;font-size:12px;font-weight:700;border-radius:999px;padding:3px 12px}
 .v-ok{background:#e9f9e2;color:#2f7d20} .v-min{background:#fff5e0;color:#9a6b00} .v-bad{background:#fdeaea;color:#b3261e}
 .qtext{font-size:16px;margin-bottom:12px}
 .figwrap{display:flex;justify-content:center;border:1px solid var(--line);border-radius:10px;padding:12px;background:#fff;margin-bottom:6px}
 .figwrap svg{max-width:100%;height:auto}
 .caption{font-size:12px;color:var(--muted);text-align:center;margin-bottom:12px}
 ol.opts{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:6px}
 .opt{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:7px 11px}
 .opt.correct{border-color:var(--accent);background:rgba(180,250,141,.18)}
 .lett{font-weight:700;color:var(--muted)} .opt.correct .lett{color:var(--accent)} .tick{margin-left:auto;color:var(--accent);font-weight:700}
 .audit{background:#f6f8f7;border-radius:10px;padding:12px 14px;font-size:13px}
 .arow{margin-bottom:6px} .y{color:#2f7d20;font-weight:700} .n{color:#b3261e;font-weight:700}
 .anote{color:#33433a;margin-top:4px}
 .defs{margin:8px 0 0;padding-left:18px} .def{margin-bottom:5px}
 .def-critical{color:#b3261e} .def-major{color:#c25700} .def-minor{color:#5b6b62}
 @media print{body{background:#fff}.card,.summary{break-inside:avoid}}
</style></head><body><div class="wrap">
<header class="doc"><h1>${esc(TITLE)}</h1>
<div style="color:var(--muted);font-size:13px">${data.length} Hard figure-dependent questions · gpt-5.4-mini @ high · audited by 9 independent agents</div></header>
<div class="summary">
 <b>${tk.productionReady ?? '–'}</b> production-ready · <b>${tk.minorIssues ?? '–'}</b> minor issues · <b>${tk.defective ?? '–'}</b> defective &nbsp;|&nbsp;
 answer keys correct: <b>${tk.answerKeyCorrect ?? '–'}/${tk.total ?? '–'}</b> · accurate-to-problem: <b>${tk.accurateCount ?? '–'}/${tk.total ?? '–'}</b> · legible: <b>${tk.legibleCount ?? '–'}/${tk.total ?? '–'}</b> · genuinely needs figure: <b>${tk.necessaryCount ?? '–'}/${tk.total ?? '–'}</b>
</div>
${cards}
</div></body></html>`;
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
