#!/usr/bin/env node
/**
 * Drut chapter question generator (production pipeline, operator-run).
 *
 * For one chapter: RAG-retrieve textbook context -> generate with OpenAI
 * gpt-5.4-mini @ high in the approved "B+C mix" format -> programmatic audit
 * gate -> LLM-verify gate (an INDEPENDENT re-solve that sees only the stem +
 * options, never the key; holds wrong-key / arithmetic-slip defects the
 * structural audit cannot see) -> write STAGED rows to cached_questions
 * (verification_status = 'ai-openai-staged', which is in NO client trust gate,
 * so nothing serves until an admin approves -> flips to 'ai-openai-audited').
 *
 * SAFETY:
 *  - DRY_RUN defaults ON: generates + RAG + audits + writes a local JSON for
 *    inspection, but does NOT touch the database. Set DRY_RUN=false to write.
 *  - Keys: OPENAI from scripts/.env.calibration; GEMINI + SUPABASE from
 *    apps/web/.env.local. Never printed. (Rotate the OpenAI key before prod.)
 *  - Requires migration 041 (cached_questions.class_level) applied before a
 *    non-dry run; the insert sets class_level.
 *
 * Run (dry):    node scripts/generate-chapter.mjs
 * Run (write):  DRY_RUN=false node scripts/generate-chapter.mjs
 * Verify gate:  ON by default. VERIFY=false skips it; VERIFY_MODEL=gpt-5.4
 *               uses a stronger independent solver (~5x verify cost, harder gate).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------- CONFIG (edit per chapter) ----------
const CONFIG = {
  subject: 'Physics',          // Physics | Chemistry | Mathematics
  // IMPORTANT: topic MUST match the app's canonical chapter name exactly (what the
  // practice chapter-selector passes to get_unseen_questions), e.g. the served
  // ap_eapcet rows use 'Chapter 5: Laws of Motion'. A bare 'Laws of Motion' will
  // NOT be served. Source this from the app's chapter taxonomy, don't free-type it.
  topic: 'Chapter 5: Laws of Motion',
  subtopic: 'mixed',           // whole-chapter bucket the serving query matches
  classLevel: '11',            // '11' = Inter 1st year, '12' = 2nd year
  board: 'BIEAP',              // RAG textbook board filter (ap_eapcet → BIEAP per getPrimaryBoardForExam)
  examProfile: 'ap_eapcet',    // ap_eapcet | ts_eapcet
  count: 9,                    // pilot: balanced 3/3/3 to compare vs legacy
  difficultyDistribution: { Easy: 0.34, Medium: 0.33, Hard: 0.33 }, // proportions, rounded to count
};
const MODEL = 'gpt-5.4-mini';
const REASONING_EFFORT = 'high';
const RAG_THRESHOLD = 0.3;     // matches rag.ts (gemini-embedding-001)
const RAG_MATCH_COUNT = 5;
const EMBEDDING_MODEL = 'text-embedding-3-small'; // OpenAI — MUST match the chunks' re-embed model (reembed-chunks.mjs)
const EMBEDDING_DIMS = 768;
const DELAY_MS = 700;
const GEN_ATTEMPTS = 3;        // regenerate on invalid-json up to this many times per slot
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default ON
// LLM-verify gate: an INDEPENDENT re-solve of each audited question. The verifier
// sees ONLY the stem + 4 options — never the keyed answer or the generated
// solution — so it cannot anchor to the proposed answer. If its computed answer
// disagrees with correctOptionIndex, matches NO option, or the call fails, the
// question is HELD (never staged). This closes the wrong-key / arithmetic-slip
// class the structural audit is blind to. Fail-closed by design.
const VERIFY = process.env.VERIFY !== 'false';            // default ON
const VERIFY_MODEL = process.env.VERIFY_MODEL || MODEL;   // independent solver; set 'gpt-5.4' for a stronger (costlier) gate
const VERIFY_EFFORT = 'high';

// ---------- keys / env (never printed) ----------
function envFromFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const webEnv = envFromFile(join(ROOT, 'apps/web/.env.local'));
const calEnv = envFromFile(join(__dirname, '.env.calibration'));
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = webEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = webEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = webEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ---------- the approved generation contract (B+C mix, no labels) ----------
const SYSTEM = `You are Drut's exam-question generator for Indian competitive exams (EAPCET beachhead; NCERT-aligned Class 11/12 Physics, Chemistry, Mathematics).

Produce ONE multiple-choice question as a SINGLE JSON object and NOTHING else (no prose, no markdown fences).

CONTENT
- ORIGINAL expression only. Never reproduce textbook wording or a textbook's solved example. Facts/formulas are fine; the phrasing and example problems must be yours.
- Exactly 4 options. Exactly one correct. correctOptionIndex is 0-based.
- difficulty must match the requested level.
- ALL math in LaTeX, inline as $...$. Use proper LaTeX commands (\\Delta, \\geq, \\le, \\times, \\rightarrow, \\frac, \\sqrt, \\theta, \\mu). NEVER paste literal Unicode math symbols (Δ, ≥, ×, →, θ, μ, √) inside math.

QUICK METHOD (the fast exam solve)
- quickMethod.steps: EXACTLY 3 short, clean steps — the fastest reliable way to solve THIS problem under time pressure, written as plain direct instructions.
- DO NOT label the steps. NEVER output the words "Trigger", "Action", "Result", or any framework label.

FULL SOLUTION (teach it properly — detailed, flowing)
- fullSolution.approach: 1-2 lines naming the governing concept/principle and why this method is the right route. This OPENS the solution.
- fullSolution.steps: an ORDERED list of flowing chunks — as many as the problem needs (typically 4-12). Each chunk = { text, display } where text is 1-3 flowing sentences (inline $...$) and display is OPTIONAL — the single pivotal equation for that chunk as LaTeX WITHOUT $ delimiters (omit/empty for verbal chunks). NO step numbers, NO headers, NO framework labels. Show every non-trivial intermediate result.
- fullSolution.answer: state the final answer plainly (value + option letter).
- NEVER output "Diagnose", "Extract", "Execute", "Proof", or any framework label.

DISTRACTORS
- distractorRationale: array of 4 strings — for EACH option, why it is correct or the specific mistake it represents. The stated arithmetic for each wrong option MUST actually produce that option's value.

Output JSON shape (keys exactly):
{
 "questionText": string,
 "options": [{"text": string},{"text": string},{"text": string},{"text": string}],
 "correctOptionIndex": 0-3,
 "difficulty": "Easy"|"Medium"|"Hard",
 "subtopic": string,
 "fsmTag": "kebab-case-solution-pattern",
 "concepts": [string],
 "quickMethod": {"steps": [string, string, string]},
 "fullSolution": {"approach": string, "steps": [{"text": string, "display": string}], "answer": string},
 "distractorRationale": [string, string, string, string],
 "timeTargets": {"ap_eapcet": number, "ts_eapcet": number, "jee_main": number}
}`;

// ---------- RAG ----------
function buildQuery(topic, subtopic, subject) {
  return [subject, topic, subtopic && subtopic !== 'mixed' && subtopic !== 'Mixed' ? subtopic : null]
    .filter(Boolean).join(' · ');
}

async function embedText(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: String(text).slice(0, 8000) || ' ', dimensions: EMBEDDING_DIMS }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const values = data.data?.[0]?.embedding ?? [];
  if (values.length !== EMBEDDING_DIMS) throw new Error(`Embedding dim mismatch: ${values.length}`);
  return values;
}

async function ragRetrieve() {
  const q = buildQuery(CONFIG.topic, CONFIG.subtopic, CONFIG.subject);
  const embedding = await embedText(q);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_syllabus_content`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: RAG_THRESHOLD,
      match_count: RAG_MATCH_COUNT,
      filter_subject: CONFIG.subject,
      filter_board: CONFIG.board,
      filter_class_level: CONFIG.classLevel,
    }),
  });
  if (!res.ok) throw new Error(`match_syllabus_content ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const chunks = await res.json();
  const context = (Array.isArray(chunks) ? chunks : [])
    .map((c, i) => `[Source ${i + 1}: ${c.textbook_title}, similarity=${Number(c.similarity).toFixed(2)}]\n${c.content}`)
    .join('\n\n---\n\n');
  return { chunks: Array.isArray(chunks) ? chunks : [], context };
}

// ---------- OpenAI ----------
function userPrompt(difficulty, context) {
  const grounding = context
    ? `AUTHORITATIVE TEXTBOOK CONTEXT (use for facts/values/scope; keep your wording ORIGINAL — do not copy phrasing):\n\n${context}\n\n---\n\n`
    : `(No textbook context retrieved — generate from your own knowledge of the NCERT syllabus.)\n\n`;
  return `${grounding}Exam: AP/TS EAPCET. Subject: ${CONFIG.subject}. Chapter: ${CONFIG.topic}. Subtopic: ${CONFIG.subtopic}. Class: ${CONFIG.classLevel} (${CONFIG.classLevel === '11' ? '1st year' : '2nd year'}). Difficulty: ${difficulty}.
Generate one original ${difficulty} MCQ for this chapter in the required format (clean 3-step Quick Method + concept-led flowing Full Solution, NO worked examples, NO framework labels). Return only the JSON object.`;
}

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    const parts = [];
    for (const item of data.output) if (Array.isArray(item.content)) for (const c of item.content) if (typeof c.text === 'string') parts.push(c.text);
    if (parts.length) return parts.join('');
  }
  return '';
}
function parseJsonLoose(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch {}
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  return null;
}
function usageOf(data) {
  const u = data.usage || {};
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    reasoning: u.output_tokens_details?.reasoning_tokens ?? 0,
  };
}
async function generateOne(difficulty, context, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, instructions: SYSTEM, input: userPrompt(difficulty, context), reasoning: { effort: REASONING_EFFORT } }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return generateOne(difficulty, context, attempt + 1); }
      return { error: data.error?.message || `HTTP ${res.status}`, usage: { input: 0, output: 0, reasoning: 0 } };
    }
    const text = extractText(data);
    return { json: parseJsonLoose(text), raw: text, usage: usageOf(data) };
  } catch (err) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return generateOne(difficulty, context, attempt + 1); }
    return { error: String(err), usage: { input: 0, output: 0, reasoning: 0 } };
  }
}

// ---------- programmatic audit gate ----------
const UNICODE_MATH = /[Δ≥≤×→θμ√√²³π∑∫°±·]/;
function auditQuestion(q) {
  const fails = [];
  if (!q) return ['invalid-json'];
  if (!Array.isArray(q.options) || q.options.length !== 4) fails.push('not-4-options');
  if (!Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) fails.push('bad-correctOptionIndex');
  if (!q.quickMethod || !Array.isArray(q.quickMethod.steps) || q.quickMethod.steps.length !== 3) fails.push('quickMethod-not-3-steps');
  if (!q.fullSolution || !q.fullSolution.approach || !Array.isArray(q.fullSolution.steps) || !q.fullSolution.steps.length || !q.fullSolution.answer) fails.push('fullSolution-incomplete');
  if (!Array.isArray(q.distractorRationale) || q.distractorRationale.length !== 4) fails.push('distractorRationale-not-4');
  // label leak
  const userText = JSON.stringify([q.quickMethod, q.fullSolution, q.distractorRationale]);
  if (/\*\*\s*(Trigger|Action|Result)\s*[:*]/i.test(userText) || /\b(DIAGNOSE|EXTRACT|EXECUTE|PROOF)\b/.test(userText)) fails.push('framework-label-leak');
  // latex hygiene (literal unicode math in any string field)
  const allText = JSON.stringify(q);
  if (UNICODE_MATH.test(allText)) fails.push('literal-unicode-math');
  return fails;
}

// ---------- LLM-verify gate (independent re-solve, fail-closed) ----------
const VERIFY_SYSTEM = `You are a strict exam answer-key checker. You will receive a multiple-choice question and its 4 options — but NOT the proposed answer and NOT any worked solution. Solve the problem YOURSELF, independently, from scratch, then map your computed result to the options.

Return a SINGLE JSON object and NOTHING else (no prose, no markdown fences):
{
 "answerIndex": 0 | 1 | 2 | 3 | -1,
 "answerValue": string,
 "reasoning": string,
 "confidence": "high" | "medium" | "low"
}

Rules:
- Do the ACTUAL calculation. Never assume an option is correct because it "looks right".
- answerIndex = the 0-based option whose value best matches what YOU computed.
- Use standard Indian competitive-exam conventions (e.g. g = 10 m/s^2 unless the question states otherwise). If two options differ only by a rounding or constant convention, pick the closest.
- Return answerIndex = -1 ONLY when none of the four options is acceptably close to your computed answer (this flags a question whose correct value is absent).
- Be strict about arithmetic, signs, and units.`;

function verifyPrompt(q, context) {
  const grounding = context ? `Reference facts (optional — for constants/values only, this is NOT the answer):\n${context}\n\n---\n\n` : '';
  const opts = (Array.isArray(q.options) ? q.options : [])
    .map((o, i) => `(${'ABCD'[i] || i}) ${o && o.text != null ? o.text : ''}`).join('\n');
  return `${grounding}Question: ${q.questionText}\n\nOptions:\n${opts}\n\nSolve it yourself and return only the JSON.`;
}

async function verifyAnswer(q, context, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: VERIFY_MODEL, instructions: VERIFY_SYSTEM, input: verifyPrompt(q, context), reasoning: { effort: VERIFY_EFFORT } }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return verifyAnswer(q, context, attempt + 1); }
      return { error: data.error?.message || `HTTP ${res.status}`, usage: { input: 0, output: 0, reasoning: 0 } };
    }
    return { json: parseJsonLoose(extractText(data)), usage: usageOf(data) };
  } catch (err) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return verifyAnswer(q, context, attempt + 1); }
    return { error: String(err), usage: { input: 0, output: 0, reasoning: 0 } };
  }
}

// Reconcile the independent verifier against the keyed answer. Fail-closed: any
// disagreement, a missing-option (-1), a bad index, or a verify error => HOLD.
function verifyVerdict(q, v) {
  if (!v || v.error || !v.json) return { ok: false, reason: 'verify-error', detail: (v && v.error) ? String(v.error).slice(0, 80) : 'no-json' };
  const idx = v.json.answerIndex;
  if (idx === -1) return { ok: false, reason: 'verify-no-matching-option', detail: String(v.json.answerValue ?? ''), verifier: v.json };
  if (!Number.isInteger(idx) || idx < 0 || idx > 3) return { ok: false, reason: 'verify-bad-index', detail: String(idx), verifier: v.json };
  if (idx !== q.correctOptionIndex) return { ok: false, reason: 'verify-mismatch', detail: `keyed ${'ABCD'[q.correctOptionIndex]} vs verifier ${'ABCD'[idx]}`, verifier: v.json };
  return { ok: true, reason: 'verify-agree', confidence: v.json.confidence || null, verifier: v.json };
}

// ---------- dedup hash (matches migration 040) ----------
function questionTextHash(questionText) {
  const norm = String(questionText || '').toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(norm).digest('hex');
}

// ---------- DB write (staged) ----------
async function insertStaged(q) {
  // source_type is NOT a top-level column on cached_questions — it lives inside
  // question_data (readers do cq.source_type || question_data.source_type).
  const questionData = { ...q, source_type: 'ai-openai', verification_status: 'ai-openai-staged' };
  const row = {
    question_id: `openai-${Date.now()}-${randomUUID().slice(0, 8)}`,
    exam_profile: CONFIG.examProfile,
    subject: CONFIG.subject,
    topic: CONFIG.topic,
    // Serving (get_unseen_questions) matches the COLUMN subtopic against what the
    // app passes for whole-chapter practice = 'mixed'. The model's specific
    // subtopic is preserved inside question_data (questionData.subtopic).
    subtopic: CONFIG.subtopic,
    difficulty: q.difficulty,
    class_level: CONFIG.classLevel,
    source: `openai-mini-high-${new Date().toISOString().slice(0, 10)}-${CONFIG.board}-${CONFIG.classLevel}-${CONFIG.subject}-${CONFIG.topic}`.replace(/\s+/g, '-'),
    verification_status: 'ai-openai-staged', // real top-level column
    fsm_tag: q.fsmTag || null,
    question_text_hash: questionTextHash(q.questionText),
    question_data: questionData,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?on_conflict=question_text_hash,exam_profile`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}

// ---------- scaling helpers ----------
function buildDifficultyList(count, dist) {
  const order = ['Easy', 'Medium', 'Hard'];
  const list = [];
  let assigned = 0;
  order.forEach((d, i) => {
    const n = i === order.length - 1 ? Math.max(0, count - assigned) : Math.round(count * (dist[d] || 0));
    for (let k = 0; k < n; k++) list.push(d);
    assigned += n;
  });
  while (list.length < count) list.push('Medium');
  return list.slice(0, count);
}

// Regenerate on invalid-json / HTTP error until we get a parseable question.
async function generateValid(difficulty, context) {
  let last;
  for (let a = 1; a <= GEN_ATTEMPTS; a++) {
    const r = await generateOne(difficulty, context);
    last = r;
    if (!r.error && r.json && r.json.questionText) return { ...r, attempts: a };
    if (a < GEN_ATTEMPTS) await new Promise(res => setTimeout(res, 800));
  }
  return { ...last, attempts: GEN_ATTEMPTS };
}

// Pre-flight: rows already present for this exact (exam_profile, topic). If 0, the
// topic string likely doesn't match the app's chapter selector, so generated rows
// would never be served — warn (and refuse to write unless FORCE_TOPIC=true).
async function countExistingForTopic() {
  const url = `${SUPABASE_URL}/rest/v1/cached_questions?select=id&exam_profile=eq.${encodeURIComponent(CONFIG.examProfile)}&topic=eq.${encodeURIComponent(CONFIG.topic)}`;
  const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' } });
  const cr = res.headers.get('content-range') || '0-0/0';
  return parseInt(cr.split('/')[1] || '0', 10) || 0;
}

// ---------- main ----------
async function main() {
  if (!OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY (scripts/.env.calibration)'); process.exit(1); }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE creds (apps/web/.env.local)'); process.exit(1); }

  const diffList = buildDifficultyList(CONFIG.count, CONFIG.difficultyDistribution);

  console.log(`\nChapter generation — ${CONFIG.subject} · ${CONFIG.topic} (class ${CONFIG.classLevel}, ${CONFIG.examProfile})`);
  console.log(`Model: ${MODEL} @ ${REASONING_EFFORT}  ·  verify: ${VERIFY ? `${VERIFY_MODEL} @ ${VERIFY_EFFORT}` : 'OFF'}  ·  questions: ${diffList.length} [${diffList.join(', ')}]  ·  DRY_RUN: ${DRY_RUN}`);

  // pre-flight topic guard
  const existing = await countExistingForTopic();
  if (existing === 0) {
    console.log(`\n⚠️  WARNING: no existing rows for topic="${CONFIG.topic}" (exam=${CONFIG.examProfile}).`);
    console.log(`   Serving matches topic EXACTLY; if this doesn't match the app's chapter selector, generated questions will NOT be served.`);
    console.log(`   See: node scripts/list-chapters.mjs ${CONFIG.examProfile} ${CONFIG.subject}`);
    if (!DRY_RUN && process.env.FORCE_TOPIC !== 'true') {
      console.log(`   Refusing to write to an unrecognized topic. Re-run with FORCE_TOPIC=true to override.\n`);
      process.exit(1);
    }
  } else {
    console.log(`Pre-flight: topic has ${existing} existing rows — recognized bucket. ✓`);
  }
  console.log('');

  console.log('RAG: retrieving textbook context...');
  let rag = { chunks: [], context: '' };
  try { rag = await ragRetrieve(); } catch (e) { console.log(`  RAG error: ${String(e).slice(0, 160)}`); }
  console.log(`  chunks retrieved: ${rag.chunks.length}` + (rag.chunks.length ? ` (top similarity ${Number(rag.chunks[0].similarity).toFixed(3)})` : ' — generating UNGROUNDED'));
  console.log('');

  const results = [];
  let written = 0, passed = 0, heldByVerify = 0;
  for (let i = 0; i < diffList.length; i++) {
    const diff = diffList[i];
    process.stdout.write(`  [${i + 1}/${diffList.length}] ${diff} ... `);
    const r = await generateValid(diff, rag.context);
    if (r.error || !r.json) {
      console.log(`ERROR after ${r.attempts} attempts: ${r.error || 'invalid-json'}`);
      results.push({ difficulty: diff, error: r.error || 'invalid-json', attempts: r.attempts });
      if (i < diffList.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
      continue;
    }
    const fails = auditQuestion(r.json);
    // Only spend a verify call if the question is structurally sound.
    let verify = null, verdict = null;
    if (!fails.length && VERIFY) {
      verify = await verifyAnswer(r.json, rag.context);
      verdict = verifyVerdict(r.json, verify);
    }
    const accepted = !fails.length && (!VERIFY || (verdict && verdict.ok));

    let status;
    if (fails.length) status = `AUDIT-FAIL [${fails.join(',')}]`;
    else if (VERIFY && !verdict.ok) status = `VERIFY-HOLD [${verdict.reason}${verdict.detail ? ': ' + verdict.detail : ''}]`;
    else status = VERIFY ? `pass (audit+verify${verdict.confidence ? ' ' + verdict.confidence : ''})` : 'audit-pass';

    let writeNote = '';
    if (accepted) {
      passed++;
      if (!DRY_RUN) { const w = await insertStaged(r.json); writeNote = w.ok ? ' -> staged' : ` -> WRITE-FAIL ${w.error}`; if (w.ok) written++; }
      else writeNote = ' -> (dry, not written)';
    } else if (!fails.length && VERIFY && verdict && !verdict.ok) {
      heldByVerify++;
    }

    const verifyTok = verify && verify.usage ? ` +ver ${verify.usage.output}` : '';
    console.log(`ok (out ${r.usage.output} / reas ${r.usage.reasoning}${verifyTok}${r.attempts > 1 ? `, ${r.attempts} attempts` : ''}) ${status}${writeNote}`);
    results.push({ difficulty: diff, json: r.json, usage: r.usage, auditFails: fails, attempts: r.attempts, verify: verify ? verify.json : null, verifyUsage: verify ? verify.usage : null, verdict });
    if (i < diffList.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  const out = { config: CONFIG, model: MODEL, effort: REASONING_EFFORT, verify: VERIFY ? { model: VERIFY_MODEL, effort: VERIFY_EFFORT } : false, dryRun: DRY_RUN, ragChunks: rag.chunks.length, generatedAt: new Date().toISOString(), results };
  const outPath = join(__dirname, `generate-chapter-output.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`\nDone. ${passed}/${diffList.length} accepted (audit${VERIFY ? '+verify' : ''}).` + (heldByVerify ? ` ${heldByVerify} held by verify.` : '') + (DRY_RUN ? ' (DRY_RUN — nothing written)' : ` ${written} staged rows written.`));
  console.log(`Output: ${outPath}`);
}

// Run only when invoked directly; importable (e.g. by scripts/test-verify-pass.mjs)
// so the verify gate can be unit-tested without firing a full generation run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { auditQuestion, verifyAnswer, verifyVerdict };
