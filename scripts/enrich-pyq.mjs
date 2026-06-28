#!/usr/bin/env node
/**
 * Enrich existing seeded PYQ / practice-paper questions with OpenAI:
 *   1. VERIFY the answer independently (flag disagreements with the stored key).
 *   2. Generate the new "B+C mix" solution (quickMethod + fullSolution +
 *      distractorRationale) WITHOUT changing the question or options.
 *
 * SAFETY: DRY-only by design — reads PYQ rows, calls OpenAI, audits, and writes a
 * local JSON + a render-input for review. It does NOT modify the database. The
 * write-back strategy (in-place enrich vs staged-pending) is a separate decision.
 *
 * Keys: OPENAI from scripts/.env.calibration; SUPABASE from apps/web/.env.local.
 *
 * Usage:
 *   node scripts/enrich-pyq.mjs                # default: 5 PYQs, any subject
 *   SUBJECT=Physics LIMIT=10 node scripts/enrich-pyq.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODEL = 'gpt-5.4-mini';
const REASONING_EFFORT = 'high';
const SOURCE_STATUS = process.env.SOURCE_STATUS || 'v3-verified-pyq';
const SUBJECT = process.env.SUBJECT || '';
const TOPIC = process.env.TOPIC || '';
const LIMIT = parseInt(process.env.LIMIT || '5', 10);
const DELAY_MS = 700;
// WRITE_BACK: enrich qualifying PYQs IN PLACE (add quickMethod+fullSolution+
// distractorRationale to question_data) — ONLY when audit passes AND the model's
// verified answer AGREES with the stored key. Disagreements/audit-fails are HELD
// for manual review. Q/options/answer are never changed; verification_status stays
// v3-verified-pyq (remains served). Default DRY.
const WRITE_BACK = process.env.WRITE_BACK === 'true';
const ONLY_UNENRICHED = process.env.ONLY_UNENRICHED === 'true'; // retry only rows missing quickMethod
const MAX_RETRY = 5;          // more retries for transient network blips (exponential backoff)

function envFromFile(p) { const o = {}; if (!existsSync(p)) return o; for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; }
const webEnv = envFromFile(join(ROOT, 'apps/web/.env.local'));
const calEnv = envFromFile(join(__dirname, '.env.calibration'));
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = webEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = webEnv.SUPABASE_SERVICE_ROLE_KEY || '';

const LETTERS = ['A', 'B', 'C', 'D'];
const SYSTEM = `You are Drut's exam answer-verifier and solution writer for Indian competitive exams (EAPCET; NCERT Class 11/12 Physics, Chemistry, Mathematics).

You are given an EXISTING multiple-choice question, its 4 options, and the stored "claimed" correct option index. Do NOT change the question text or the options.

Two jobs:
1. VERIFY: solve the problem independently and decide the correct option index yourself. Report verifiedCorrectIndex (0-3), agreesWithClaimed (boolean), and verificationNote (if you disagree, name the option you believe is correct and why; if you agree, a one-line confirmation).
2. SOLVE in Drut's format (clean, NO framework labels):
   - quickMethod.steps: EXACTLY 3 short clean steps (the fast exam solve). Never the words Trigger/Action/Result.
   - fullSolution: { approach, steps:[{text, display}], answer } — approach = concept-led opener; steps = flowing chunks (1-3 sentences each, inline $...$), with display = OPTIONAL pivotal equation as LaTeX WITHOUT $ delimiters. NO numbers, NO headers, never the words Diagnose/Extract/Execute/Proof.
   - distractorRationale: 4 strings, one per option, why correct or the specific mistake.
   - ALL math as LaTeX with proper commands (\\Delta, \\geq, \\times, \\frac, \\sqrt); NEVER literal Unicode math symbols.
   The solution must justify YOUR verifiedCorrectIndex.

Output ONE JSON object and nothing else:
{"verifiedCorrectIndex":0-3,"agreesWithClaimed":bool,"verificationNote":string,"quickMethod":{"steps":[string,string,string]},"fullSolution":{"approach":string,"steps":[{"text":string,"display":string}],"answer":string},"distractorRationale":[string,string,string,string]}`;

function userPrompt(qd) {
  const opts = (qd.options || []).map((o, i) => `${LETTERS[i]}. ${typeof o === 'string' ? o : o.text}`).join('\n');
  return `Subject: ${qd.subject || ''}. Question:\n${qd.questionText}\n\nOptions:\n${opts}\n\nStored claimed correct index: ${qd.correctOptionIndex} (${LETTERS[qd.correctOptionIndex] || '?'})\n\nVerify the answer and write the solution. Return only the JSON object.`;
}

function extractText(d) { if (typeof d.output_text === 'string' && d.output_text) return d.output_text; if (Array.isArray(d.output)) { const p = []; for (const it of d.output) if (Array.isArray(it.content)) for (const c of it.content) if (typeof c.text === 'string') p.push(c.text); if (p.length) return p.join(''); } return ''; }
function parseJsonLoose(t) { let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(); try { return JSON.parse(s); } catch {} const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} } return null; }
function usageOf(d) { const u = d.usage || {}; return { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, reasoning: u.output_tokens_details?.reasoning_tokens ?? 0 }; }

async function enrichOne(qd, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, instructions: SYSTEM, input: userPrompt(qd), reasoning: { effort: REASONING_EFFORT } }),
    });
    const data = await res.json();
    if (!res.ok) { if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1500 * attempt)); return enrichOne(qd, attempt + 1); } return { error: data.error?.message || `HTTP ${res.status}` }; }
    const json = parseJsonLoose(extractText(data));
    if (!json && attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1200 * attempt)); return enrichOne(qd, attempt + 1); }
    return { json, usage: usageOf(data) };
  } catch (e) { if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1500 * attempt)); return enrichOne(qd, attempt + 1); } return { error: String(e) }; }
}

const UNICODE_MATH = /[Δ≥≤×→θμ√²³π∑∫°±·]/;
function auditEnrichment(e) {
  const fails = [];
  if (!e) return ['invalid-json'];
  if (!e.quickMethod || !Array.isArray(e.quickMethod.steps) || e.quickMethod.steps.length !== 3) fails.push('quickMethod-not-3');
  if (!e.fullSolution || !e.fullSolution.approach || !Array.isArray(e.fullSolution.steps) || !e.fullSolution.steps.length || !e.fullSolution.answer) fails.push('fullSolution-incomplete');
  if (!Array.isArray(e.distractorRationale) || e.distractorRationale.length !== 4) fails.push('distractorRationale-not-4');
  if (!Number.isInteger(e.verifiedCorrectIndex) || e.verifiedCorrectIndex < 0 || e.verifiedCorrectIndex > 3) fails.push('bad-verifiedCorrectIndex');
  const ut = JSON.stringify([e.quickMethod, e.fullSolution, e.distractorRationale]);
  if (/\*\*\s*(Trigger|Action|Result)\s*[:*]/i.test(ut) || /\b(DIAGNOSE|EXTRACT|EXECUTE|PROOF)\b/.test(ut)) fails.push('label-leak');
  if (UNICODE_MATH.test(JSON.stringify(e))) fails.push('literal-unicode-math');
  return fails;
}

async function patchQuestionData(id, mergedQd) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ question_data: mergedQd }),
  });
  if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 160)}` };
  return { ok: true };
}

async function main() {
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SERVICE_KEY) { console.error('Missing creds'); process.exit(1); }
  let q = `cached_questions?select=id,subject,topic,difficulty,question_data&verification_status=eq.${SOURCE_STATUS}&limit=${LIMIT}`;
  if (SUBJECT) q += `&subject=eq.${encodeURIComponent(SUBJECT)}`;
  if (TOPIC) q += `&topic=eq.${encodeURIComponent(TOPIC)}`;
  if (ONLY_UNENRICHED) q += `&question_data->quickMethod=is.null`;
  const rr = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  const rows = await rr.json();
  console.log(`Enriching ${rows.length} ${SOURCE_STATUS} questions (DRY — no DB writes).\n`);

  const results = [];
  let pass = 0, disagree = 0, written = 0, held = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; const qd = { ...row.question_data, subject: row.subject };
    process.stdout.write(`  [${i + 1}/${rows.length}] ${row.subject}/${row.topic}/${row.difficulty} ... `);
    const r = await enrichOne(qd);
    if (r.error || !r.json) { console.log(`ERROR: ${r.error || 'invalid-json'}`); results.push({ id: row.id, error: r.error || 'invalid-json' }); continue; }
    const fails = auditEnrichment(r.json);
    const agree = r.json.agreesWithClaimed === true && r.json.verifiedCorrectIndex === qd.correctOptionIndex;
    if (!agree) disagree++;
    if (!fails.length) pass++;
    const qualifies = !fails.length && agree;
    let writeNote = '';
    if (WRITE_BACK) {
      if (qualifies) {
        const merged = { ...row.question_data, quickMethod: r.json.quickMethod, fullSolution: r.json.fullSolution, distractorRationale: r.json.distractorRationale, enrichedBy: 'openai-mini-high', enrichedAt: new Date().toISOString() };
        const w = await patchQuestionData(row.id, merged);
        if (w.ok) { written++; writeNote = ' -> enriched in place'; } else { writeNote = ` -> WRITE-FAIL ${w.error}`; }
      } else { held++; writeNote = ' -> HELD (review)'; }
    }
    console.log(`${fails.length ? 'AUDIT-FAIL [' + fails.join(',') + ']' : 'audit-pass'} | answer ${agree ? 'AGREES' : `DISAGREES (stored=${qd.correctOptionIndex}, model=${r.json.verifiedCorrectIndex})`}${writeNote}`);
    results.push({ id: row.id, subject: row.subject, topic: row.topic, difficulty: row.difficulty, questionText: qd.questionText, options: qd.options, claimedIndex: qd.correctOptionIndex, verifiedIndex: r.json.verifiedCorrectIndex, agree, qualifies, verificationNote: r.json.verificationNote, enrichment: { quickMethod: r.json.quickMethod, fullSolution: r.json.fullSolution, distractorRationale: r.json.distractorRationale }, auditFails: fails, usage: r.usage });
    if (i < rows.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  writeFileSync(join(__dirname, 'enrich-pyq-output.json'), JSON.stringify({ model: MODEL, effort: REASONING_EFFORT, sourceStatus: SOURCE_STATUS, generatedAt: new Date().toISOString(), results }, null, 2));

  // render-input (merge original Q/options + new solution)
  const renderInput = results.filter(r => r.enrichment).map(r => ({
    task: { subject: r.subject, chapter: r.topic, subtopic: (r.agree ? 'answer verified ✓' : '⚠ ANSWER DISAGREES') + (r.auditFails?.length ? ' · audit-fail' : ''), difficulty: r.difficulty },
    json: { questionText: r.questionText, options: r.options, correctOptionIndex: r.verifiedIndex, quickMethod: r.enrichment.quickMethod, fullSolution: r.enrichment.fullSolution, distractorRationale: r.enrichment.distractorRationale },
  }));
  writeFileSync(join(__dirname, 'enrich-pyq-render-input.json'), JSON.stringify(renderInput, null, 2));

  console.log(`\nDone. ${pass}/${rows.length} passed audit · ${disagree} answer disagreement(s) flagged.`);
  if (WRITE_BACK) console.log(`Write-back: ${written} enriched in place · ${held} HELD for review (disagree/audit-fail).`);
  else console.log(`(DRY — no DB writes. Set WRITE_BACK=true to enrich qualifying rows in place.)`);
  console.log(`Output: scripts/enrich-pyq-output.json  ·  render-input: scripts/enrich-pyq-render-input.json`);
}
main();
