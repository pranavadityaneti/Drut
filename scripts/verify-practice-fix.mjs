#!/usr/bin/env node
/**
 * Verify subject-scoped serving + that the rows the RPC returns actually pass the
 * client trust gate (new-format quickMethod+fullSolution). The danger: get_unseen
 * orders fsm_tag (legacy) rows first, which the client filters out -> empty + quota burn.
 * Run: node scripts/verify-practice-fix.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };
const SERVABLE_STATUS = ['ai-openai-audited', 'v3-verified-pyq', 'admin-verified', 'manual-curated', '2.6', 'SubjectFallback'];

async function rpcRows(subject, limit) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/get_unseen_questions`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ p_user_id: randomUUID(), p_exam_profile: 'ap_eapcet', p_topic: 'ALL', p_subtopic: 'mixed', p_difficulty: 'Medium', p_limit: limit, p_subject: subject }),
  });
  if (r.status >= 400) return { status: r.status, rows: [] };
  return { status: r.status, rows: JSON.parse(await r.text()) };
}
const isNewFormat = (qd) => qd && qd.quickMethod && qd.fullSolution;
const statusOk = (s) => SERVABLE_STATUS.some(t => (s || '').includes(t));

for (const subject of ['Physics', 'Mathematics', 'Chemistry']) {
  const { status, rows } = await rpcRows(subject, 30);
  const newFmt = rows.filter(r => isNewFormat(r.question_data)).length;
  const servable = rows.filter(r => isNewFormat(r.question_data) && statusOk(r.verification_status)).length;
  const withFsm = rows.filter(r => r.fsm_tag).length;
  console.log(`${subject}: RPC status ${status}, returned ${rows.length} | new-format ${newFmt} | SERVABLE (client-gate) ${servable} | has fsm_tag ${withFsm}`);
  // sample statuses
  const statuses = {}; rows.forEach(r => { const k = r.verification_status || 'null'; statuses[k] = (statuses[k] || 0) + 1; });
  console.log(`   verification_status breakdown: ${JSON.stringify(statuses)}`);
}
