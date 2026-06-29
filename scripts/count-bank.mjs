#!/usr/bin/env node
// Count servable (new-format + approved, == what the RPC serves) vs total, by exam+subject.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}`, Prefer: 'count=exact', Range: '0-0' };
const SERVABLE = "or=(verification_status.like.*ai-openai-audited*,verification_status.like.*v3-verified-pyq*,verification_status.like.*admin-verified*,verification_status.like.*manual-curated*,verification_status.like.*2.6*,verification_status.like.*SubjectFallback*)";
const NEWFMT = "question_data->quickMethod=not.is.null&question_data->fullSolution=not.is.null";
async function cnt(q) { const r = await fetch(`${SUPA}/rest/v1/cached_questions?${q}&select=id`, { headers: H }); const cr = r.headers.get('content-range'); return cr ? cr.split('/')[1] : `ERR${r.status}`; }
const exams = ['ap_eapcet', 'ts_eapcet', 'eamcet', 'jee_main', 'jee', 'jee_advanced'];
const subjects = ['Physics', 'Mathematics', 'Chemistry'];
for (const e of exams) {
  const tExam = await cnt(`exam_profile=eq.${e}`);
  if (tExam === '0') continue;
  console.log(`\n=== ${e} (total rows: ${tExam}) ===`);
  let sSum = 0;
  for (const s of subjects) {
    const total = await cnt(`exam_profile=eq.${e}&subject=eq.${s}`);
    if (total === '0') continue;
    const servable = await cnt(`exam_profile=eq.${e}&subject=eq.${s}&${NEWFMT}&${SERVABLE}`);
    if (/^\d+$/.test(servable)) sSum += +servable;
    console.log(`  ${s.padEnd(12)} servable ${String(servable).padStart(5)}  / total ${total}`);
  }
  console.log(`  ${'SERVABLE TOTAL'.padEnd(12)} ${sSum}`);
}
