#!/usr/bin/env node
/**
 * Verify the serve path for OpenAI-pipeline questions end-to-end (no app/auth):
 *  1. Align the ai-openai-staged rows to the served convention (canonical topic +
 *     subtopic='mixed') so get_unseen_questions can match them.
 *  2. Approve ONE (verification_status -> 'ai-openai-audited') — simulates the
 *     admin AI-Review "Approve".
 *  3. Call the real get_unseen_questions RPC for the chapter, then apply the SAME
 *     trust gate the web app uses, and confirm: approved row is SERVED, staged
 *     rows are filtered out.
 *
 * Service-role (bypasses RLS). Read-mostly + a couple of metadata updates on our
 * own ai-openai rows. Run: node scripts/verify-serving.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };

const TOPIC = 'Chapter 5: Laws of Motion';
const SUBTOPIC = 'mixed';
const EXAM = 'ap_eapcet';

// web trust gate (mirror of NewPractice filter + ai-openai-audited)
const TRUSTED = ['2.6', 'SubjectFallback', 'ai-openai-audited'];
const isTrusted = (vs) => !!vs && TRUSTED.some(t => String(vs).includes(t));

async function patch(id, body) {
  const r = await fetch(`${SUPA}/rest/v1/cached_questions?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

(async () => {
  // 1. fetch our staged rows
  const sr = await fetch(`${SUPA}/rest/v1/cached_questions?verification_status=eq.ai-openai-staged&select=id,topic,subtopic&order=generated_at.desc`, { headers: H });
  const staged = await sr.json();
  console.log(`Found ${staged.length} ai-openai-staged rows.`);
  if (!staged.length) { console.log('Nothing to verify. Run generate-chapter.mjs (DRY_RUN=false) first.'); return; }

  // 2. align all to served convention
  for (const row of staged) await patch(row.id, { topic: TOPIC, subtopic: SUBTOPIC });
  console.log(`Aligned ${staged.length} rows -> topic="${TOPIC}", subtopic="${SUBTOPIC}".`);

  // 3. approve ONE (simulate admin)
  const approvedId = staged[0].id;
  await patch(approvedId, { verification_status: 'ai-openai-audited' });
  console.log(`Approved 1 row (${approvedId.slice(0, 8)}) -> ai-openai-audited. ${staged.length - 1} remain staged.`);

  // 4. call the real serving RPC
  const rpc = await fetch(`${SUPA}/rest/v1/rpc/get_unseen_questions`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ p_user_id: randomUUID(), p_exam_profile: EXAM, p_topic: TOPIC, p_subtopic: SUBTOPIC, p_difficulty: 'ALL', p_limit: 100 }),
  });
  const served = await rpc.json();
  if (!Array.isArray(served)) { console.log('RPC error:', JSON.stringify(served).slice(0, 200)); return; }

  const ours = served.filter(q => String(q.verification_status || '').startsWith('ai-openai'));
  const passTrust = ours.filter(q => isTrusted(q.verification_status));
  console.log(`\nget_unseen_questions returned ${served.length} rows for the chapter.`);
  console.log(`  of those, ${ours.length} are our ai-openai rows.`);
  console.log(`  passing the web trust gate (i.e. actually shown to users): ${passTrust.length}`);
  ours.forEach(q => console.log(`   - ${q.id.slice(0, 8)} vs=${q.verification_status} -> ${isTrusted(q.verification_status) ? 'SERVED ✓' : 'filtered out (correct)'}`));
  console.log(passTrust.length === 1 && passTrust[0].id === approvedId
    ? '\nRESULT: PASS — only the approved question is served; staged ones are correctly withheld.'
    : '\nRESULT: review the above.');
})().catch(e => console.log('ERR', String(e).slice(0, 200)));
