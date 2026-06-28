// Render the beta-readiness audit (scripts/.readiness-audit.json) into a single
// self-contained HTML report: docs/beta-readiness-report.html
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const areas = JSON.parse(readFileSync(join(ROOT, 'scripts', '.readiness-audit.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sevRank = { P0: 0, P1: 1, P2: 2 };

const gaps = [];
const done = [];
areas.forEach(a => (a.findings || []).forEach(x => {
  const rec = { area: (a.area || '').split(/[ (&]/)[0], ...x };
  if (['broken', 'gap', 'mock'].includes(x.status)) gaps.push(rec); else done.push(rec);
}));
gaps.sort((p, q) => (sevRank[p.severity] - sevRank[q.severity]) || p.status.localeCompare(q.status));

const overallColor = { 'ready': '#2f8a4e', 'mostly-ready': '#3f9b5f', 'partial': '#b4540a', 'not-started': '#c0392b', 'broken': '#c0392b' };
const statusBadge = { broken: '#c0392b', gap: '#b4540a', mock: '#8a6d1a', done: '#2f8a4e' };

const scorecard = areas.map(a => {
  const c = { P0: 0, P1: 0, P2: 0 }; (a.findings || []).forEach(x => { if (['broken', 'gap', 'mock'].includes(x.status)) c[x.severity]++; });
  return `<tr><td>${esc((a.area || '').split(/[(]/)[0])}</td><td style="color:${overallColor[a.overall] || '#333'};font-weight:700">${esc(a.overall)}</td><td>${c.P0 || '·'}</td><td>${c.P1 || '·'}</td><td>${c.P2 || '·'}</td><td style="font-size:12px;color:#5c6b63">${esc(a.web_status).slice(0, 70)}</td><td style="font-size:12px;color:#5c6b63">${esc(a.mobile_status).slice(0, 70)}</td></tr>`;
}).join('');

const gapRow = (g) => `<tr>
  <td><span class="pill" style="background:${statusBadge[g.status]}">${g.status}</span></td>
  <td><strong>${g.severity}</strong></td>
  <td>${esc(g.area)} · ${esc(g.platform)}</td>
  <td><strong>${esc(g.item)}</strong><div class="det">${esc(g.detail)}</div>${(g.files || []).length ? `<div class="files">${(g.files || []).slice(0, 3).map(f => esc(f.replace(/^.*\/Drut\//, ''))).join(' · ')}</div>` : ''}</td>
</tr>`;

const section = (title, sev) => {
  const rows = gaps.filter(g => g.severity === sev);
  if (!rows.length) return '';
  return `<h2>${title} <span class="count">${rows.length}</span></h2>
  <table class="gaps"><tr><th>Status</th><th>Sev</th><th>Area</th><th>Item</th></tr>${rows.map(gapRow).join('')}</table>`;
};

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drut — Beta-Readiness Report</title>
<style>
 :root{--ink:#16211c;--muted:#5c6b63;--line:#e0e7e2;--soft:#f5f9f6;--accent:#b4fa8d}
 *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0;line-height:1.55;background:#fff}
 .wrap{max-width:1000px;margin:0 auto;padding:36px 24px 90px}
 h1{font-size:28px;margin:0 0 2px;letter-spacing:-0.02em} .sub{color:var(--muted);font-size:13.5px;margin:0 0 22px}
 h2{font-size:19px;margin:34px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--line)} .count{font-size:13px;color:var(--muted);font-weight:600}
 table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13.5px} th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top} th{background:var(--soft);font-weight:700}
 table.score td:nth-child(n+3):nth-child(-n+5){text-align:center;font-weight:700}
 .pill{display:inline-block;color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;text-transform:uppercase}
 .det{font-size:12.5px;color:#3a463f;margin-top:3px} .files{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8a978f;margin-top:3px}
 .verdict{background:var(--accent);color:#13241a;border-radius:12px;padding:16px 20px;margin:16px 0;font-weight:600}
 .good{background:#eef7f0;border:1px solid #cfe8d6;border-radius:10px;padding:12px 18px;margin:14px 0}
 .plan{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:14px 20px;margin:14px 0}
 ol li,ul li{margin:4px 0;font-size:14px}
 @media print{.wrap{max-width:none}}
</style></head><body><div class="wrap">
 <h1>Beta-Readiness Report</h1>
 <p class="sub">Drut · ${new Date().toISOString().slice(0, 10)} · 8-area audit (web + mobile + shared) · ${gaps.length} actionable gaps · golden path: signup → onboarding → practice → solution → analytics → paywall → payment</p>

 <div class="verdict">The core product loop is real and wired — practice (pick → fetch from the live bank → answer → grade → Quick Method + Full Solution → mastery/streak) works on both platforms, and the student dashboard widgets read real data. The gaps cluster in: payments (not built in main), mobile Sprint (stubbed), one missing analytics RPC, web session persistence, Google OAuth (web), and a few mock/placeholder UI bits.</div>

 <h2>Readiness scorecard</h2>
 <table class="score"><tr><th>Area</th><th>Overall</th><th>P0</th><th>P1</th><th>P2</th><th>Web</th><th>Mobile</th></tr>${scorecard}</table>

 <div class="good"><strong>What already works (don't touch):</strong> email login (web+mobile), onboarding + profile save/read (multi-exam), the full practice loop + DB question serving + grading + mastery/streak, Sprint on <em>web</em>, most dashboard analytics widgets (wired to real attempt data), loading/empty/error states, route guards, admin AI-Review + ingestion.</div>

 ${section('P0 — blocks a credible closed beta', 'P0')}
 ${section('P1 — needed for a solid beta', 'P1')}
 ${section('P2 — polish / post-beta', 'P2')}

 <div class="plan"><h2 style="border:0;margin:0 0 8px">Recommended fix order (closed beta)</h2>
 <ol>
  <li><strong>Decide payments scope:</strong> closed beta is invite-only — run it <em>free</em> and defer the whole Paywall/Razorpay area to pre-public-launch? (That removes ~16 P0/P1 gaps from the beta path in one decision.)</li>
  <li><strong>Kill fake data shown to users</strong> (credibility): hardcoded dashboard trend badges (+12.5%), ArenaWidget mock leaderboard, mini-practice mock questions → hide or wire to real data.</li>
  <li><strong>Analytics RPC:</strong> add/restore <code>get_user_analytics</code> (or remove the <code>fetchUserAnalytics()</code> call) so the dashboard stats row stops erroring.</li>
  <li><strong>Web session persistence:</strong> enable <code>persistSession</code> (localStorage) so a page refresh doesn't log users out.</li>
  <li><strong>Google OAuth (web):</strong> add the callback route + Supabase redirect config, or hide the Google button until it's wired (email login already works).</li>
  <li><strong>Mobile Sprint:</strong> wire it to <code>startSession</code>/persist results like web — or hide the Sprint tab on mobile for beta if web-only is acceptable.</li>
  <li><strong>Dead nav + stub handlers:</strong> hide web sidebar items with no routes (analytics/previous_papers/faqs/contact) and wire the Dashboard handlers, so nothing clicks into nothing.</li>
 </ol></div>
</div></body></html>`;

writeFileSync(join(ROOT, 'docs', 'beta-readiness-report.html'), html);
console.log(`Wrote docs/beta-readiness-report.html — ${gaps.length} gaps (P0:${gaps.filter(g => g.severity === 'P0').length} P1:${gaps.filter(g => g.severity === 'P1').length} P2:${gaps.filter(g => g.severity === 'P2').length})`);
