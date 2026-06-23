#!/usr/bin/env node
/**
 * DB-wide audit: does every cached_questions row carry the NEW approved format
 * (question_data.quickMethod + question_data.fullSolution), or does it still
 * render the OLD theOptimalPath / fullStepByStep?
 *
 * Read-only (service role). Uses count-only HEAD requests (no payload pulled).
 * Run: node scripts/audit-question-format.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}` };

const TRUSTED = ['v3-verified-pyq', 'v3-verified-textbook', 'v3-verified-rag', '2.6', 'SubjectFallback', 'ai-openai-audited'];
const WEB_SERVED = ['2.6', 'SubjectFallback', 'ai-openai-audited']; // the strict web NewPractice filter

// count rows matching a PostgREST filter (returns total via Content-Range)
async function count(filter = '') {
  const r = await fetch(`${SUPA}/rest/v1/cached_questions?select=id${filter}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  return parseInt((r.headers.get('content-range') || '0-0/0').split('/')[1] || '0', 10) || 0;
}

const HAS_QM = '&question_data->quickMethod=not.is.null';
const NO_QM = '&question_data->quickMethod=is.null';
const HAS_FS = '&question_data->fullSolution=not.is.null';
const HAS_OP = '&question_data->theOptimalPath=not.is.null';
const HAS_FSS = '&question_data->fullStepByStep=not.is.null';

(async () => {
  const total = await count('');
  const newComplete = await count(`${HAS_QM}${HAS_FS}`);
  const hasQM = await count(HAS_QM);
  const hasFS = await count(HAS_FS);
  const hasOP = await count(HAS_OP);
  const legacyRender = await count(`${NO_QM}&or=(question_data->theOptimalPath.not.is.null,question_data->fullStepByStep.not.is.null)`);
  const noSolution = await count(`${NO_QM}&question_data->fullSolution=is.null&question_data->theOptimalPath=is.null&question_data->fullStepByStep=is.null&question_data->full_solution=is.null`);

  console.log(`\n=== DB-wide question-format audit ===`);
  console.log(`Total questions: ${total}`);
  console.log(`\nFORMAT:`);
  console.log(`  ✅ NEW format complete (quickMethod + fullSolution): ${newComplete}  (${(100 * newComplete / total).toFixed(1)}%)`);
  console.log(`     has quickMethod: ${hasQM} · has fullSolution: ${hasFS}` + (hasQM !== hasFS ? `  ⚠ mismatch (partial)` : ''));
  console.log(`  ❌ LEGACY render (no quickMethod, has theOptimalPath/fullStepByStep): ${legacyRender}  (${(100 * legacyRender / total).toFixed(1)}%)`);
  console.log(`  ⚪ NO solution of any kind: ${noSolution}`);
  console.log(`  (still carry old theOptimalPath anywhere: ${hasOP})`);

  // per verification_status: total + new
  const statuses = {};
  let from = 0;
  for (;;) {
    const r = await fetch(`${SUPA}/rest/v1/cached_questions?select=verification_status`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach(x => { const k = x.verification_status || '(null)'; statuses[k] = (statuses[k] || 0) + 1; });
    if (rows.length < 1000) break; from += 1000;
  }
  console.log(`\nBY verification_status  [total / NEW-format / served-tier]:`);
  for (const [st, tot] of Object.entries(statuses).sort((a, b) => b[1] - a[1])) {
    const stFilter = st === '(null)' ? '&verification_status=is.null' : `&verification_status=eq.${encodeURIComponent(st)}`;
    const nw = await count(`${stFilter}${HAS_QM}${HAS_FS}`);
    const tier = WEB_SERVED.includes(st) ? 'web+mobile' : TRUSTED.includes(st) ? 'mobile-only' : 'not-served';
    console.log(`  ${String(tot).padStart(5)} / ${String(nw).padStart(5)}  ${st.padEnd(20)} [${tier}]`);
  }

  // served-to-users coverage (the number that really matters)
  const webServedFilter = `&verification_status=in.(${WEB_SERVED.join(',')})`;
  const webServedTotal = await count(webServedFilter);
  const webServedNew = await count(`${webServedFilter}${HAS_QM}${HAS_FS}`);
  console.log(`\nSERVED-TO-USERS (web strict filter ${WEB_SERVED.join('/')}):`);
  console.log(`  ${webServedTotal} served · ${webServedNew} on new format · ${webServedTotal - webServedNew} still legacy`);

  console.log(`\nVERDICT: ${newComplete === total ? 'ALL questions on new format ✓' : `${total - newComplete} of ${total} questions are NOT on the new format (would need migration).`}`);
})().catch(e => console.log('ERR', String(e).slice(0, 300)));
