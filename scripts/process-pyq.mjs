#!/usr/bin/env node
/**
 * STEP 3 — PYQ pipeline: turn extracted past-paper questions into staged,
 * verified, new-format (B+C) questions for admin review.
 *
 * Input  : scripts/extract-pyq-output.json (from extract-pyq-pdf.mjs) —
 *          bilingual questions { questionNumber, subject, questionText,
 *          questionTextTe, options:[{en,te}], correctOptionIndex, hasDiagram }.
 *
 * Per question:
 *   1. SKIP diagram questions (hasDiagram) — figures aren't handled yet (HELD).
 *   2. TAG to the single canonical AP chapter for its subject — gpt-5.4 DOUBLE-PASS,
 *      both passes must AGREE and not be low-confidence, else QUARANTINE (never
 *      guessed). "Be extra careful about chapter tagging." class_level is looked
 *      up from EXAM_TAXONOMY for the assigned chapter (never invented).
 *   3. VERIFY the official answer key independently (gpt-5.4-mini high) and
 *      GENERATE the new B+C solution (quickMethod + fullSolution +
 *      distractorRationale). Official key is authoritative for a real paper:
 *      model DISAGREEMENT -> HELD for human review (not staged).
 *   4. AUDIT (3-step quick / complete full / 4 distractors / label-leak /
 *      unicode-math). Fail -> HELD.
 *   5. STAGE qualifying rows (tagged + agree + audit-pass) to cached_questions
 *      as verification_status='ai-openai-staged' (in NO client trust gate -> NOT
 *      served until an admin approves in the AI Review tab). Telugu text is PARKED
 *      in question_data (questionTextTe / optionsTe) for a future bilingual mode.
 *
 * SAFETY: DRY default ON (no DB writes; writes local output + render-input +
 *   a backup of any existing same-hash rows). Run (write): DRY_RUN=false ...
 *
 * Keys: OPENAI from scripts/.env.calibration; SUPABASE from apps/web/.env.local.
 *
 * Usage:
 *   node scripts/process-pyq.mjs                         # DRY, whole input
 *   LIMIT=5 node scripts/process-pyq.mjs                 # DRY, first 5
 *   DRY_RUN=false node scripts/process-pyq.mjs           # stage qualifying rows
 *   INPUT=scripts/extract-shift2.json node scripts/process-pyq.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { recordUsage } from './usage-log.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GEN_MODEL = 'gpt-5.4-mini';
const GEN_EFFORT = 'high';
const TAG_MODEL = process.env.TAG_MODEL || 'gpt-5.4';
const INPUT = process.env.INPUT || join(__dirname, 'extract-pyq-output.json');
const EXAM_PROFILE = process.env.EXAM_PROFILE || 'ap_eapcet';
const LIMIT = parseInt(process.env.LIMIT || '0', 10) || 0; // 0 = all
const DRY_RUN = process.env.DRY_RUN !== 'false';
const DELAY_MS = 600;
const MAX_RETRY = 5;
const LETTERS = ['A', 'B', 'C', 'D'];

function envFromFile(p) { const o = {}; if (!existsSync(p)) return o; for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; }
const webEnv = envFromFile(join(ROOT, 'apps/web/.env.local'));
const calEnv = envFromFile(join(__dirname, '.env.calibration'));
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = webEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = webEnv.SUPABASE_SERVICE_ROLE_KEY || '';

// ---------- canonical chapter list (+ class_level) from EXAM_TAXONOMY ----------
// Parse ONLY the exam's own TopicDef array so chapter literals from OTHER exams
// can't pollute the canonical set. ap/ts_eapcet -> EAPCET_TOPICS (state board);
// jee_main -> JEE_MAIN_TOPICS (NCERT-2024). These lists genuinely differ.
function loadCanon() {
  const txt = readFileSync(join(ROOT, 'packages/shared/src/lib/taxonomy.ts'), 'utf8');
  const constName = EXAM_PROFILE === 'jee_main' ? 'JEE_MAIN_TOPICS' : 'EAPCET_TOPICS';
  const start = txt.indexOf(`${constName}: TopicDef[] = [`);
  if (start < 0) throw new Error(`${constName} not found in taxonomy.ts`);
  const end = txt.indexOf('\n];', start);
  const block = txt.slice(start, end < 0 ? undefined : end);
  const re = /\{\s*value:\s*"([^"]+)",\s*subject:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*class_level:\s*"([^"]+)"/g;
  const bySubject = {}; const classOf = {}; let m;
  while ((m = re.exec(block))) {
    const [, , subject, label, cl] = m;
    (bySubject[subject] = bySubject[subject] || new Set()).add(label);
    classOf[`${subject}||${label}`] = cl;
  }
  return { bySubject, classOf };
}
const { bySubject: CANON, classOf: CLASS_OF } = loadCanon();

// Map an extracted subject string -> canonical taxonomy subject key.
function normSubject(s) {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('math')) return 'Mathematics';
  if (v.startsWith('phys')) return 'Physics';
  if (v.startsWith('chem')) return 'Chemistry';
  return null;
}

// Deterministic broken/incomplete-extraction guard. Some questions reference content
// that the extractor dropped — most commonly "which of the following statements" items
// whose enumerated statements (i)/(ii)/(iii) live in the options but are MISSING from
// the stem (e.g. Q4), or a figure referenced in text but never captured. These are
// unanswerable as extracted and must never be staged. Reliable + cost-free (pre-tag).
const ROMAN_REF = /\((?:i{1,3}|iv|v|vi{0,3})\)/i;  // (i)(ii)(iii)(iv)(v)...
function checkIncomplete(q) {
  const stem = String(q.questionText || '');
  const opts = (q.options || []).map(o => (typeof o === 'string' ? o : (o.en ?? o.text ?? '')));
  // (a) options enumerate statements (i)/(ii)/... that the stem never lists
  if (opts.some(o => ROMAN_REF.test(o)) && !ROMAN_REF.test(stem)) return 'options reference enumerated statements missing from the question stem';
  // (b) stem points at a figure/graph that was not captured as a diagram
  if (!q.hasDiagram && /\b(in the figure|from the figure|figure shown|shown in the figure|adjacent figure|following figure|given figure|from the graph|in the graph|diagram shown)\b/i.test(stem)) return 'question references a figure/diagram that was not captured';
  return null;
}

// ---------- OpenAI helpers ----------
function extractText(d) { if (typeof d.output_text === 'string' && d.output_text) return d.output_text; if (Array.isArray(d.output)) { const p = []; for (const it of d.output) if (Array.isArray(it.content)) for (const c of it.content) if (typeof c.text === 'string') p.push(c.text); if (p.length) return p.join(''); } return ''; }
function parseJsonLoose(t) { let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(); try { return JSON.parse(s); } catch {} const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} } return null; }
function usageOf(d) { const u = d.usage || {}; return { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, reasoning: u.output_tokens_details?.reasoning_tokens ?? 0 }; }
const enOpts = (q) => (q.options || []).map((o) => (typeof o === 'string' ? o : (o.en ?? o.text ?? '')));
const teOpts = (q) => (q.options || []).map((o) => (typeof o === 'string' ? '' : (o.te ?? '')));

// ---------- 1) TAG (canonical chapter, double-pass, quarantine-on-uncertainty) ----------
async function classifyOnce(q, subject, attempt = 1) {
  const names = [...CANON[subject]];
  const sys = `You classify an AP EAPCET ${subject} multiple-choice question into EXACTLY ONE chapter from the allowed list. Classify by the CORE CONCEPT tested, not surface keywords.\n\nALLOWED CHAPTERS (copy one verbatim, or "UNCERTAIN"):\n${names.map(n => `- ${n}`).join('\n')}\n\nReturn ONLY JSON: { "chapter": "<exact string or UNCERTAIN>", "confidence": "high"|"medium"|"low" }`;
  const input = `Question: ${q.questionText}\n\nOptions:\n${enOpts(q).map((o, i) => `(${LETTERS[i]}) ${o}`).join('\n')}`;
  try {
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify({ model: TAG_MODEL, instructions: sys, input, reasoning: { effort: 'medium' } }) });
    const d = await res.json();
    if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1200 * attempt)); return classifyOnce(q, subject, attempt + 1); } return { error: d.error?.message || `HTTP ${res.status}` }; }
    { const u = usageOf(d); recordUsage({ script: 'process-pyq', model: TAG_MODEL, op: 'tag', input: u.input, output: u.output, reasoning: u.reasoning, meta: LOG_META }); }
    return { json: parseJsonLoose(extractText(d)) };
  } catch (e) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1200 * attempt)); return classifyOnce(q, subject, attempt + 1); } return { error: String(e) }; }
}
const RANK = { high: 3, medium: 2, low: 1 };
async function tagChapter(q, subject) {
  const set = CANON[subject];
  if (!set) return { status: 'quarantine', reason: `no canonical list for subject ${subject}` };
  const [a, b] = await Promise.all([classifyOnce(q, subject), classifyOnce(q, subject)]);
  const ca = a.json, cb = b.json;
  const agree = ca && cb && ca.chapter === cb.chapter && ca.chapter !== 'UNCERTAIN' && set.has(ca.chapter);
  if (!agree) return { status: 'quarantine', reason: 'no-agreement', p1: ca?.chapter, p2: cb?.chapter };
  const conf = RANK[ca.confidence] <= RANK[cb.confidence] ? ca.confidence : cb.confidence;
  if (conf === 'low') return { status: 'quarantine', reason: 'low-confidence', p1: ca.chapter, p2: cb.chapter };
  return { status: 'ok', chapter: ca.chapter, confidence: conf, classLevel: CLASS_OF[`${subject}||${ca.chapter}`] || null };
}

// ---------- 2) VERIFY + GENERATE (B+C, identical to enrich-pyq's proven prompt) ----------
const SYSTEM = `You are Drut's exam answer-verifier and solution writer for Indian competitive exams (EAPCET; NCERT Class 11/12 Physics, Chemistry, Mathematics).

You are given an EXISTING multiple-choice question, its 4 options, and the stored "claimed" correct option index. Do NOT change the question text or the options.

Two jobs:
1. VERIFY: solve the problem independently and decide the correct option index yourself. Report verifiedCorrectIndex (0-3), agreesWithClaimed (boolean), and verificationNote (if you disagree, name the option you believe is correct and why; if you agree, a one-line confirmation). Also report answerable (boolean): false if the question CANNOT be fully solved from the text given because it refers to statements, options, a figure, a table, or data that are NOT present in the text provided; true only if everything needed to solve is present.
2. SOLVE in Drut's format (clean, NO framework labels):
   - quickMethod.steps: EXACTLY 3 short clean steps (the fast exam solve). Never the words Trigger/Action/Result.
   - fullSolution: { approach, steps:[{text, display}], answer } — approach = concept-led opener; steps = flowing chunks (1-3 sentences each, inline $...$), with display = OPTIONAL pivotal equation as LaTeX WITHOUT $ delimiters. NO numbers, NO headers, never the words Diagnose/Extract/Execute/Proof.
   - distractorRationale: 4 strings, one per option, why correct or the specific mistake.
   - ALL math as LaTeX with proper commands (\\Delta, \\geq, \\times, \\frac, \\sqrt); NEVER literal Unicode math symbols.
   - EVERY math symbol — including set/relation symbols — must be a LaTeX command INSIDE $...$ (it only renders inside delimiters). Convert: ℝ->$\\mathbb{R}$, ∈->$\\in$, ∞->$\\infty$, ≤->$\\leq$, ≥->$\\geq$, ≠->$\\neq$, →->$\\to$, μ->$\\mu$, θ->$\\theta$, π->$\\pi$, ×->$\\times$, ²->$x^2$. NEVER emit a bare Unicode character like ℝ, μ, ≤, →, ², ∈.
   The solution must justify YOUR verifiedCorrectIndex.
3. CONCEPTS: list 3-5 short concept/formula labels the question tests (plain words, e.g. "Permutations with restrictions", "Vowel-consonant arrangement"). No math symbols needed.
4. RATE difficulty for a MEDIAN well-prepared EAPCET aspirant — a 17-year-old who has studied the full syllabus, NOT an expert and NOT you. Judge how THEY would fare under real exam time pressure (≈1 minute per question), not how easily you solve it:
   - facility: integer 0-100 = the percentage of such aspirants who would answer correctly under time pressure. Be realistic and do NOT inflate — experts find these trivial, but aspirants misread, mis-apply formulas, and run out of time. A routine one-step question might be 75-90; a multi-step or trap-laden one 25-45.
   - studentSeconds: integer = realistic solve time (seconds) for that median aspirant.
   - requiresInsight: boolean = true if a correct solve needs a non-obvious trick/observation OR the question has a common trap that snares well-prepared students.

Output ONE JSON object and nothing else:
{"verifiedCorrectIndex":0-3,"agreesWithClaimed":bool,"answerable":bool,"verificationNote":string,"quickMethod":{"steps":[string,string,string]},"fullSolution":{"approach":string,"steps":[{"text":string,"display":string}],"answer":string},"distractorRationale":[string,string,string,string],"concepts":[string],"facility":0-100,"studentSeconds":int,"requiresInsight":bool}`;

function userPrompt(q, subject) {
  const opts = enOpts(q).map((o, i) => `${LETTERS[i]}. ${o}`).join('\n');
  return `Subject: ${subject}. Question:\n${q.questionText}\n\nOptions:\n${opts}\n\nStored claimed correct index: ${q.correctOptionIndex} (${LETTERS[q.correctOptionIndex] || '?'})\n\nVerify the answer and write the solution. Return only the JSON object.`;
}
async function verifyAndSolve(q, subject, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify({ model: GEN_MODEL, instructions: SYSTEM, input: userPrompt(q, subject), reasoning: { effort: GEN_EFFORT } }) });
    const d = await res.json();
    if (!res.ok) { if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1500 * attempt)); return verifyAndSolve(q, subject, attempt + 1); } return { error: d.error?.message || `HTTP ${res.status}` }; }
    const json = parseJsonLoose(extractText(d));
    if (!json && attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1200 * attempt)); return verifyAndSolve(q, subject, attempt + 1); }
    { const u = usageOf(d); recordUsage({ script: 'process-pyq', model: GEN_MODEL, op: 'verify+solve', input: u.input, output: u.output, reasoning: u.reasoning, meta: LOG_META }); }
    return { json, usage: usageOf(d) };
  } catch (e) { if (attempt < MAX_RETRY) { await new Promise(r => setTimeout(r, 1500 * attempt)); return verifyAndSolve(q, subject, attempt + 1); } return { error: String(e) }; }
}

// ---------- 2b) REPAIR (Unicode math -> properly-delimited LaTeX) ----------
// Fires only when the stored fields contain literal Unicode math. The model
// places the $...$ delimiters correctly (deterministic substitution can't —
// bare \mathbb{R} outside $...$ renders as literal text). Wording/meaning/count
// are preserved; only the symbol encoding changes.
const REPAIR_SYS = `You fix math encoding in an existing JSON solution that contains literal Unicode math symbols (e.g. ℝ, μ, ≤, ×, →, ², ∈, ∞). Rewrite it so EVERY math symbol is a LaTeX command wrapped in inline math $...$ (ℝ->$\\mathbb{R}$, μ->$\\mu$, ≤->$\\leq$, ²->$x^2$, →->$\\to$, ∈->$\\in$). Change NOTHING else: identical wording, identical math meaning, identical number of steps and distractors. Do not add, remove, merge, or reorder anything. Return ONLY the JSON object with EXACTLY this shape: {"quickMethod":{"steps":[s,s,s]},"fullSolution":{"approach":s,"steps":[{"text":s,"display":s}],"answer":s},"distractorRationale":[s,s,s,s]}`;
async function repairUnicode(fields, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify({ model: GEN_MODEL, instructions: REPAIR_SYS, input: JSON.stringify(fields), reasoning: { effort: 'medium' } }) });
    const d = await res.json();
    if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1200 * attempt)); return repairUnicode(fields, attempt + 1); } return null; }
    { const u = usageOf(d); recordUsage({ script: 'process-pyq', model: GEN_MODEL, op: 'repair', input: u.input, output: u.output, reasoning: u.reasoning, meta: LOG_META }); }
    const j = parseJsonLoose(extractText(d));
    if (!j && attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); return repairUnicode(fields, attempt + 1); }
    return j;
  } catch { if (attempt < 3) { await new Promise(r => setTimeout(r, 1200 * attempt)); return repairUnicode(fields, attempt + 1); } return null; }
}

// ---------- 3) AUDIT ----------
// Any literal Unicode math symbol: Greek (θμπΔΣ…), letterlike (ℝℂℚℤℕ…),
// arrows (→↔⇒…), math operators (∈∉∞∪∩∑∫√≤≥≠≈∝∂∇…), super/subscripts,
// fractions, ×÷°±·. Excludes curly quotes / em-dash / ellipsis (legit prose).
const UNICODE_MATH = /[Ͱ-Ͽ℀-⅏←-⇿∀-⋿²³¹¼-¾×÷°±·√]/;
function audit(e) {
  const fails = [];
  if (!e) return ['invalid-json'];
  if (!e.quickMethod || !Array.isArray(e.quickMethod.steps) || e.quickMethod.steps.length !== 3) fails.push('quickMethod-not-3');
  if (!e.fullSolution || !e.fullSolution.approach || !Array.isArray(e.fullSolution.steps) || !e.fullSolution.steps.length || !e.fullSolution.answer) fails.push('fullSolution-incomplete');
  if (!Array.isArray(e.distractorRationale) || e.distractorRationale.length !== 4) fails.push('distractorRationale-not-4');
  if (!Number.isInteger(e.verifiedCorrectIndex) || e.verifiedCorrectIndex < 0 || e.verifiedCorrectIndex > 3) fails.push('bad-verifiedCorrectIndex');
  // Scope BOTH content checks to the fields we actually STORE + RENDER. The
  // model's transient verificationNote is not stored/shown, so Unicode there must
  // not gate the question (that was a false-positive hold).
  const ut = JSON.stringify([e.quickMethod, e.fullSolution, e.distractorRationale]);
  if (/\*\*\s*(Trigger|Action|Result)\s*[:*]/i.test(ut) || /\b(DIAGNOSE|EXTRACT|EXECUTE|PROOF)\b/.test(ut)) fails.push('label-leak');
  if (UNICODE_MATH.test(ut)) fails.push('literal-unicode-math');
  const fac = Number(e.facility);
  if (!Number.isFinite(fac) || fac < 0 || fac > 100) fails.push('bad-facility');
  if (!Number.isFinite(Number(e.studentSeconds)) || Number(e.studentSeconds) <= 0) fails.push('bad-studentSeconds');
  return fails;
}

// timeTargets: seconds per exam profile (EAPCET = realistic solve time; JEE gets ~30% more headroom).
function timeTargetsFrom(studentSeconds) {
  const s = Math.max(20, Math.min(180, Math.round(Number(studentSeconds) || 60)));
  return { ap_eapcet: s, ts_eapcet: s, jee_main: Math.round(s * 1.3) };
}

// ---------- 4) STAGE ----------
function questionTextHash(t) { return createHash('sha256').update(String(t || '').toLowerCase().replace(/\s+/g, ' ')).digest('hex'); }

async function fetchExistingByHash(hash) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?select=id,topic,verification_status&question_text_hash=eq.${hash}&exam_profile=eq.${encodeURIComponent(EXAM_PROFILE)}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  return res.ok ? res.json() : [];
}
// Cross-run idempotency: every question_text_hash already in the bank for this exam.
// Lets a killed/restarted run SKIP already-processed questions BEFORE the expensive
// tag+verify+generate — so the marathon resumes cheaply instead of re-spending.
async function fetchExistingHashes() {
  const set = new Set(); let from = 0; const PAGE = 1000;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?select=question_text_hash&exam_profile=eq.${encodeURIComponent(EXAM_PROFILE)}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Range: `${from}-${from + PAGE - 1}` } });
    if (!res.ok) break;
    const rows = await res.json(); if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach(r => r.question_text_hash && set.add(r.question_text_hash));
    if (rows.length < PAGE) break; from += PAGE;
  }
  return set;
}
async function insertStaged(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?on_conflict=question_text_hash,exam_profile`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}

function paperLabelFrom(pdfPath) {
  const f = basename(String(pdfPath || '')).toUpperCase();
  const shift = /SHIFT[_\s-]*2/.test(f) ? 'Shift 2' : /SHIFT[_\s-]*1/.test(f) ? 'Shift 1' : '';
  const day = (f.match(/(\d{1,2})(?:ST|ND|RD|TH)?[_\s-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/) || []);
  const date = day[1] ? `${day[1]} ${day[2][0] + day[2].slice(1).toLowerCase()}` : '';
  return `AP EAPCET — ${[date, shift].filter(Boolean).join(', ')}`.replace(/—\s*$/, '').trim();
}

async function main() {
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SERVICE_KEY) { console.error('Missing creds (OPENAI / SUPABASE)'); process.exit(1); }
  if (!existsSync(INPUT)) { console.error(`Input not found: ${INPUT}`); process.exit(1); }

  const data = JSON.parse(readFileSync(INPUT, 'utf8'));
  let questions = data.questions || [];
  if (LIMIT) questions = questions.slice(0, LIMIT);
  const paper = paperLabelFrom(data.config?.pdf);
  PAPER = paper;
  LOG_META = { paper, exam: EXAM_PROFILE };
  const sourcePdf = basename(String(data.config?.pdf || ''));

  console.log(`\nSTEP 3 — PYQ pipeline  ·  DRY_RUN: ${DRY_RUN}`);
  console.log(`Input: ${basename(INPUT)}  ·  paper: "${paper}"  ·  exam_profile: ${EXAM_PROFILE}`);
  console.log(`Canonical chapters: Maths ${CANON.Mathematics?.size}, Physics ${CANON.Physics?.size}, Chemistry ${CANON.Chemistry?.size}`);
  const existingHashes = await fetchExistingHashes();
  console.log(`Already in bank (exam ${EXAM_PROFILE}): ${existingHashes.size} questions — will be skipped if re-seen.`);
  console.log(`Questions to process: ${questions.length}\n`);

  const results = [];
  const stageRows = [];        // {row, hash} — for counts/reporting
  const dedupKeys = new Set(); // aggressive content key — kills near-dupes from overlapping extraction windows
  const dedupKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let tagged = 0, agreeCount = 0, auditPass = 0, ready = 0, written = 0, writeFail = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const tag = `[${i + 1}/${questions.length}] Q${q.questionNumber ?? '?'} ${q.subject || '?'}`;
    const subject = normSubject(q.subject);

    // 1) diagram -> HOLD
    if (q.hasDiagram) { console.log(`  ${tag} … SKIP (diagram — held)`); results.push({ ...meta(q), outcome: 'hold-diagram' }); continue; }
    if (!subject) { console.log(`  ${tag} … QUARANTINE (unknown subject)`); results.push({ ...meta(q), outcome: 'quarantine-subject' }); continue; }
    if (enOpts(q).filter(Boolean).length !== 4 || !Number.isInteger(q.correctOptionIndex)) { console.log(`  ${tag} … HOLD (malformed: opts/key)`); results.push({ ...meta(q), outcome: 'hold-malformed' }); continue; }
    const incompleteReason = checkIncomplete(q);
    if (incompleteReason) { console.log(`  ${tag} … HOLD (incomplete: ${incompleteReason})`); results.push({ ...meta(q), subject, outcome: 'hold-incomplete', incompleteReason }); continue; }
    // cross-run idempotency: already in the bank -> skip BEFORE any API spend
    const preHash = questionTextHash(q.questionText);
    if (existingHashes.has(preHash)) { console.log(`  ${tag} … SKIP-EXISTS (already in bank)`); results.push({ ...meta(q), subject, outcome: 'skip-exists' }); continue; }

    process.stdout.write(`  ${tag} … tag`);
    // 2) TAG
    const t = await tagChapter(q, subject);
    if (t.status !== 'ok') { console.log(` -> QUARANTINE (${t.reason}; p1="${t.p1 || ''}" p2="${t.p2 || ''}")`); results.push({ ...meta(q), subject, outcome: 'quarantine-tag', tagReason: t.reason, p1: t.p1, p2: t.p2 }); continue; }
    tagged++;
    if (!t.classLevel) { console.log(` -> QUARANTINE (no class_level for "${t.chapter}")`); results.push({ ...meta(q), subject, outcome: 'quarantine-classlevel', chapter: t.chapter }); continue; }
    process.stdout.write(` ✓ "${t.chapter}" (${t.confidence}) cls${t.classLevel} | verify`);

    // 3) VERIFY + GENERATE
    const r = await verifyAndSolve(q, subject);
    if (r.error || !r.json) { console.log(` -> ERROR (${r.error || 'invalid-json'})`); results.push({ ...meta(q), subject, chapter: t.chapter, outcome: 'error', error: r.error || 'invalid-json' }); continue; }
    let sol = r.json;
    let fails = audit(sol);
    let repaired = false;
    // 3b) Unicode repair pass (only fires on a real Unicode-in-stored-fields hold)
    if (fails.includes('literal-unicode-math')) {
      process.stdout.write(' [repair]');
      const fixed = await repairUnicode({ quickMethod: sol.quickMethod, fullSolution: sol.fullSolution, distractorRationale: sol.distractorRationale });
      if (fixed?.quickMethod && fixed?.fullSolution && fixed?.distractorRationale) {
        const cand = { ...sol, quickMethod: fixed.quickMethod, fullSolution: fixed.fullSolution, distractorRationale: fixed.distractorRationale };
        const f2 = audit(cand);
        if (f2.length <= fails.length) { sol = cand; fails = f2; repaired = true; }
      }
    }
    const agree = sol.agreesWithClaimed === true && sol.verifiedCorrectIndex === q.correctOptionIndex;
    if (agree) agreeCount++;
    if (!fails.length) auditPass++;
    const qualifies = agree && !fails.length;

    const base = { ...meta(q), subject, chapter: t.chapter, tagConfidence: t.confidence, classLevel: t.classLevel, verifiedIndex: sol.verifiedCorrectIndex, agree, repaired, auditFails: fails, verificationNote: sol.verificationNote, enrichment: { quickMethod: sol.quickMethod, fullSolution: sol.fullSolution, distractorRationale: sol.distractorRationale }, usage: r.usage };

    if (!qualifies) {
      const why = !agree ? `disagree (key=${q.correctOptionIndex}, model=${sol.verifiedCorrectIndex})` : `audit-fail [${fails.join(',')}]`;
      console.log(` -> HOLD (${why})`);
      results.push({ ...base, outcome: !agree ? 'hold-disagree' : 'hold-audit' });
      continue;
    }

    // 3c) model-flagged incompleteness — the model explicitly says the question can't
    // be fully solved from the text (missing statements/figure/data). General backstop
    // to the deterministic checkIncomplete() guard.
    if (sol.answerable === false) {
      console.log(` -> HOLD (model flagged not answerable — missing content)`);
      results.push({ ...base, outcome: 'hold-incomplete', incompleteReason: 'model-flagged: ' + String(sol.verificationNote || '').slice(0, 140) });
      continue;
    }

    // 3d) solve-confidence gate — NOT a difficulty signal. The model is generally
    // optimistic (research: LLMs find most items easy), so a very low self-solvability
    // means it could not actually verify — usually a broken/incomplete question.
    // Secondary to the explicit answerable flag + deterministic guard.
    const solveConfidence = Math.round(Number(sol.facility));
    if (Number.isFinite(solveConfidence) && solveConfidence < 20) {
      console.log(` -> HOLD (low solve-confidence ${solveConfidence}% — likely broken/incomplete)`);
      results.push({ ...base, outcome: 'hold-lowconf', solveConfidence, verificationNote: sol.verificationNote });
      continue;
    }

    // 4) dedup — drop a near-identical question already staged this run (overlapping
    // extraction windows capture some questions twice). DB on_conflict is only a
    // backstop; this closes the class even when whitespace/LaTeX differs.
    const dk = dedupKey(q.questionText);
    if (dedupKeys.has(dk)) { console.log(` -> DUP-SKIP (already staged this run)`); results.push({ ...base, outcome: 'dup-skip' }); continue; }
    dedupKeys.add(dk);

    // build staged row (official key is the answer; model agreed)
    ready++;
    const studentSeconds = Math.round(Number(sol.studentSeconds));
    const requiresInsight = sol.requiresInsight === true;
    // Difficulty is UNCALIBRATED at cold-start. Research is unambiguous: expert AND LLM
    // difficulty labels are unreliable (experts ~33% of variance; best LLM barely beats a
    // mean baseline). So we DO NOT assert a band — 'Medium' is only a neutral serving
    // bucket (NOT shown to users), replaced by the Elo/empirical engine once attempts arrive.
    const difficulty = 'Medium';
    const questionData = {
      questionText: q.questionText,
      questionTextTe: q.questionTextTe || null,        // PARKED for future bilingual mode
      options: enOpts(q).map((text) => ({ text })),    // {text} objects — MUST match served-question schema (app reads o.text)
      optionsTe: teOpts(q).map((text) => ({ text })),  // PARKED for future bilingual mode
      correctOptionIndex: q.correctOptionIndex,        // official paper key (model-agreed)
      subject, topic: t.chapter, subtopic: 'mixed', difficulty, class_level: t.classLevel,
      quickMethod: sol.quickMethod,
      fullSolution: sol.fullSolution,
      distractorRationale: sol.distractorRationale,
      concepts: Array.isArray(sol.concepts) ? sol.concepts.slice(0, 6) : [],
      timeTargets: timeTargetsFrom(studentSeconds),   // time IS text-predictable (research) — powers Sprint
      // Difficulty provenance — neutral until the Elo/empirical engine calibrates it from real attempts.
      difficultySource: 'uncalibrated',
      calibrated: false,
      difficultyMeta: { modelSolveConfidence: solveConfidence, studentSeconds, requiresInsight },
      source_type: 'pyq-openai',
      verification_status: 'ai-openai-staged',
      paper, sourcePdf, questionNumber: q.questionNumber ?? null,
      enrichedBy: 'openai-mini-high', enrichedAt: ISO,
    };
    const hash = questionTextHash(q.questionText);
    const row = {
      question_id: `pyq-${EXAM_PROFILE}-${randomUUID().slice(0, 8)}`,
      exam_profile: EXAM_PROFILE,
      subject, topic: t.chapter, subtopic: 'mixed', difficulty, class_level: t.classLevel,
      source: `pyq-${EXAM_PROFILE}-${sourcePdf.replace(/\.pdf$/i, '').toLowerCase()}`.replace(/\s+/g, '-'),
      verification_status: 'ai-openai-staged',
      fsm_tag: null,
      question_text_hash: hash,
      question_data: questionData,
    };
    stageRows.push({ row, hash });
    // INSERT IMMEDIATELY (not batched at the end) so progress persists per-question —
    // a kill mid-run loses only the in-flight question, and skip-exists resumes the rest.
    let writeNote = ' (DRY)';
    if (!DRY_RUN) {
      const w = await insertStaged(row);
      if (w.ok) { written++; existingHashes.add(hash); writeNote = ' -> staged'; }
      else { writeFail++; writeNote = ` -> WRITE-FAIL ${w.error}`; }
    }
    console.log(` -> STAGE-READY [conf ${solveConfidence}% · ${studentSeconds}s${requiresInsight ? ' · insight' : ''} · uncalibrated]${writeNote}`);
    results.push({ ...base, outcome: 'stage-ready', question_id: row.question_id, solveConfidence, studentSeconds, requiresInsight, concepts: questionData.concepts });
    if (i < questions.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  writeFileSync(join(__dirname, 'process-pyq-output.json'), JSON.stringify({ input: basename(INPUT), paper, examProfile: EXAM_PROFILE, dryRun: DRY_RUN, generatedAt: ISO, summary: { total: questions.length, tagged, agree: agreeCount, auditPass, ready, stageReady: stageRows.length, written }, results }, null, 2));

  // render-input: only stage-ready, in the renderer's task/json shape (verify visually)
  const renderInput = results.filter(r => r.outcome === 'stage-ready').map(r => ({
    task: { subject: r.subject, chapter: r.chapter, subtopic: `${r.paper} · Q${r.questionNumber} · answer verified ✓`, difficulty: 'calibrating' },
    json: { questionText: r.questionText, options: (r.options || []).map(o => (typeof o === 'string' ? { text: o } : o)), correctOptionIndex: r.verifiedIndex, concepts: r.concepts, quickMethod: r.enrichment.quickMethod, fullSolution: r.enrichment.fullSolution, distractorRationale: r.enrichment.distractorRationale },
  }));
  writeFileSync(join(__dirname, 'process-pyq-render-input.json'), JSON.stringify(renderInput, null, 2));

  // Staging happened per-question in the loop (resumable). skip-exists + on_conflict
  // ignore-duplicates mean nothing is ever overwritten, so no colliding-row backup is
  // needed; rollback (if ever) = delete where source like 'pyq-<exam>%' AND status='ai-openai-staged'.
  if (!DRY_RUN) console.log(`\nWRITTEN: ${written} staged (ai-openai-staged), ${writeFail} failed.`);

  // ---- summary ----
  const by = (o) => results.filter(r => r.outcome === o).length;
  console.log(`\n── Summary (${questions.length} questions) ──`);
  console.log(`  STAGE-READY     : ${by('stage-ready')}${DRY_RUN ? ' (DRY — not written)' : ' (written)'}`);
  console.log(`  SKIP-EXISTS     : ${by('skip-exists')}  (already in bank — idempotent resume)`);
  console.log(`  DUP-SKIP        : ${by('dup-skip')}  (near-identical re-capture)`);
  console.log(`  HOLD diagram    : ${by('hold-diagram')}`);
  console.log(`  HOLD disagree   : ${by('hold-disagree')}  (answer dispute — review)`);
  console.log(`  HOLD audit-fail : ${by('hold-audit')}`);
  console.log(`  HOLD incomplete : ${by('hold-incomplete')}  (broken extraction — missing statements/figure/data)`);
  console.log(`  HOLD low-conf   : ${by('hold-lowconf')}  (model couldn't verify)`);
  console.log(`  HOLD malformed  : ${by('hold-malformed')}`);
  console.log(`  QUARANTINE tag  : ${by('quarantine-tag') + by('quarantine-subject') + by('quarantine-classlevel')}  (uncertain chapter — review)`);
  console.log(`  ERROR           : ${by('error')}`);
  console.log(`\n  tagged ${tagged}/${questions.length} · answer-agree ${agreeCount} · audit-pass ${auditPass}`);

  const sr = results.filter(r => r.outcome === 'stage-ready');
  if (sr.length) {
    const avgSec = Math.round(sr.reduce((a, r) => a + (r.studentSeconds || 0), 0) / sr.length);
    console.log(`\n  Difficulty: UNCALIBRATED for all ${sr.length} (no label shown; Elo/empirical engine sets it from real attempts).`);
    console.log(`  Solve-time (model est, powers Sprint): avg ${avgSec}s  ·  concepts attached to ${sr.filter(r => (r.concepts || []).length).length}/${sr.length}`);
  }

  console.log(`\nOutput: scripts/process-pyq-output.json  ·  render-input: scripts/process-pyq-render-input.json`);
  if (DRY_RUN) console.log(`(DRY — no DB writes. Re-run with DRY_RUN=false to stage the ${stageRows.length} ready rows.)`);
}

const ISO = new Date().toISOString();
let PAPER = '';
let LOG_META = {};   // {paper, exam} attached to every usage-ledger line for this run
function meta(q) { return { questionNumber: q.questionNumber ?? null, questionText: q.questionText, options: enOpts(q), claimedIndex: q.correctOptionIndex, paper: PAPER }; }

main().catch(e => { console.error('FATAL', String(e).slice(0, 400)); process.exit(1); });
