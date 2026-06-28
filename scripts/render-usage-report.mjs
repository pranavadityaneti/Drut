// Render the OpenAI usage ledger (scripts/.openai-usage.jsonl) into a single
// self-contained HTML document: docs/openai-usage-ledger.html
//
// Run:  node scripts/render-usage-report.mjs
// Re-run anytime to refresh the document from the live ledger.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'scripts', '.openai-usage.jsonl');
const OUT = join(ROOT, 'docs', 'openai-usage-ledger.html');

const rows = existsSync(LEDGER)
  ? readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];

const usd = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const num = (n) => (n || 0).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const groupBy = (key) => {
  const m = new Map();
  for (const r of rows) {
    const k = (typeof key === 'function' ? key(r) : r[key]) || '—';
    const g = m.get(k) || { k, calls: 0, input: 0, output: 0, cost: 0 };
    g.calls++; g.input += r.input || 0; g.output += r.output || 0; g.cost += r.cost || 0;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.cost - a.cost);
};

const total = rows.reduce((a, r) => ({ calls: a.calls + 1, input: a.input + (r.input || 0), output: a.output + (r.output || 0), cost: a.cost + (r.cost || 0) }), { calls: 0, input: 0, output: 0, cost: 0 });
const firstTs = rows.length ? rows[0].ts : null;
const lastTs = rows.length ? rows[rows.length - 1].ts : null;

const table = (title, groups, label) => `
  <h2>${title}</h2>
  <table><tr><th>${label}</th><th>Calls</th><th>Input tok</th><th>Output tok</th><th>Cost</th><th>% of total</th></tr>
  ${groups.map(g => `<tr><td>${esc(g.k)}</td><td>${num(g.calls)}</td><td>${num(g.input)}</td><td>${num(g.output)}</td><td>${usd(g.cost)}</td><td>${total.cost ? ((g.cost / total.cost) * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}
  </table>`;

const recent = rows.slice(-40).reverse();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drut — OpenAI API Usage & Cost Ledger</title>
<style>
  :root{--ink:#16211c;--muted:#5c6b63;--line:#e0e7e2;--green:#2f8a4e;--accent:#b4fa8d;--soft:#f5f9f6}
  *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;line-height:1.55;background:#fff}
  .wrap{max-width:920px;margin:0 auto;padding:36px 24px 80px}
  h1{font-size:27px;margin:0 0 2px;letter-spacing:-0.02em} .sub{color:var(--muted);font-size:13.5px;margin:0 0 22px}
  h2{font-size:18px;margin:30px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--line)}
  .cards{display:flex;gap:14px;flex-wrap:wrap;margin:18px 0}
  .card{flex:1;min-width:150px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 18px}
  .card .v{font-size:26px;font-weight:800;letter-spacing:-0.02em} .card .l{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
  .card.big{background:var(--accent);border-color:#9fe87a} .card.big .v{color:#13241a}
  table{border-collapse:collapse;width:100%;margin:8px 0 4px;font-size:13.5px}
  th,td{border:1px solid var(--line);padding:7px 10px;text-align:left} th{background:var(--soft);font-weight:700}
  td:nth-child(n+2),th:nth-child(n+2){text-align:right}
  .note{background:#fff8ec;border:1px solid #f1d9a8;border-left:4px solid #c98a1a;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:13.5px}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
  @media print{.wrap{max-width:none}}
</style></head><body><div class="wrap">
  <h1>OpenAI API — Usage &amp; Cost Ledger</h1>
  <p class="sub">Drut · auto-generated from scripts/.openai-usage.jsonl · ${rows.length ? `${num(rows.length)} calls logged, ${firstTs?.slice(0, 10)} → ${lastTs?.slice(0, 16).replace('T', ' ')}` : 'no calls logged yet'}</p>

  <div class="cards">
    <div class="card big"><div class="v">${usd(total.cost)}</div><div class="l">Estimated total spend</div></div>
    <div class="card"><div class="v">${num(total.calls)}</div><div class="l">API calls</div></div>
    <div class="card"><div class="v">${num(total.input)}</div><div class="l">Input tokens</div></div>
    <div class="card"><div class="v">${num(total.output)}</div><div class="l">Output tokens</div></div>
  </div>

  <div class="note"><strong>Estimate, not the bill.</strong> Token counts are exact (from the API). Dollars = tokens × published rates (gpt-5.4-mini $0.75/$4.50, gpt-5.4 $2.50/$15.0, gpt-5.5 $5/$30, embeddings $0.02 per 1M in/out). The <strong>authoritative billed total is the OpenAI dashboard</strong> → <span class="mono">platform.openai.com/usage</span>. This ledger covers calls made <em>after</em> cost-logging was wired in (2026-06-25); spend before that is in the dashboard only.</div>

  ${rows.length ? `
  ${table('By model', groupBy('model'), 'Model')}
  ${table('By script', groupBy('script'), 'Script')}
  ${table('By operation', groupBy('op'), 'Operation')}
  ${table('By exam', groupBy(r => r.meta?.exam || r.meta?.examProfile), 'Exam')}
  ${table('By paper', groupBy(r => r.meta?.paper), 'Paper / source')}
  ${table('By day', groupBy(r => (r.ts || '').slice(0, 10)), 'Date (UTC)')}

  <h2>Recent calls (last ${recent.length})</h2>
  <table><tr><th>Time (UTC)</th><th>Script</th><th>Op</th><th>Model</th><th>In</th><th>Out</th><th>Cost</th></tr>
  ${recent.map(r => `<tr><td class="mono">${esc((r.ts || '').slice(0, 19).replace('T', ' '))}</td><td>${esc(r.script)}</td><td>${esc(r.op)}</td><td>${esc(r.model)}</td><td>${num(r.input)}</td><td>${num(r.output)}</td><td>${usd4(r.cost)}</td></tr>`).join('')}
  </table>` : `<div class="note">No API calls have been logged yet. Run an instrumented script (process-pyq, extract-pyq-pdf) and re-run <span class="mono">node scripts/render-usage-report.mjs</span> to populate this document.</div>`}
</div></body></html>`;

writeFileSync(OUT, html);
console.log(`Wrote ${OUT}  (${rows.length} calls, ${usd(total.cost)} estimated total)`);
