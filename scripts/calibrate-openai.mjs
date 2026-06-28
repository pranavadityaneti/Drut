#!/usr/bin/env node
/**
 * OpenAI question-generation calibration harness.
 *
 * Generates a 20-question sample with gpt-5.4-mini, measuring EXACT token usage
 * (input / output / reasoning) and computing cost — so we can assess quality and
 * project the cost of a 10,000-question batch on mini AND on the premium models.
 *
 * KEY HANDLING: the key is read from scripts/.env.calibration (gitignored) or the
 * OPENAI_API_KEY env var. The key is never hard-coded. Nothing is printed that
 * reveals the key.
 *
 * Run:  node scripts/calibrate-openai.mjs
 * Output:  scripts/calibration-output.json  (the 20 questions + raw usage)
 *          scripts/calibration-report.md     (token + cost assessment)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- config ----
const MODEL = 'gpt-5.4-mini';
const REASONING_EFFORT = 'high'; // none | low | medium | high | xhigh
const API_URL = 'https://api.openai.com/v1/responses';
// Confirmed prices (USD per 1M tokens), from the OpenAI models doc:
const PRICES = {
  'gpt-5.4-mini': { in: 0.75, out: 4.50 },
  'gpt-5.4': { in: 2.50, out: 15.0 },
  'gpt-5.5': { in: 5.0, out: 30.0 },
};
const BATCH_TARGET = 10000;
const DELAY_MS = 700;

// ---- key (from gitignored file or env; never hard-coded) ----
function readKey() {
  const envFile = join(__dirname, '.env.calibration');
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.trim().startsWith('OPENAI_API_KEY'));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
  return process.env.OPENAI_API_KEY || '';
}

// ---- the generation contract (system instructions) ----
const SYSTEM = `You are Drut's exam-question generator for Indian competitive exams (EAPCET beachhead; NCERT-aligned Class 11/12 Physics, Chemistry, Mathematics).

Produce ONE multiple-choice question as a SINGLE JSON object and NOTHING else (no prose, no markdown fences).

Hard rules:
- ORIGINAL expression only. Never reproduce textbook wording or a textbook's solved example. Facts/formulas are fine; the phrasing and the example problems must be yours.
- Exactly 4 options. Exactly one correct. correctOptionIndex is 0-based.
- Use LaTeX for ALL math, inline as $...$ (e.g. $v^2 = u^2 + 2as$).
- theOptimalPath (T.A.R.) = the Quick Method, ALWAYS present (exists=true). Give exactly 3 steps prefixed "**Trigger:**", "**Action:**", "**Result:**" that show the SIMPLEST, fastest clean way to solve THIS problem under exam time pressure. It need NOT be a clever non-obvious trick — it is the most efficient straightforward 3-step path. Trigger = the cue that tells you which method/idea applies; Action = the key operation to perform; Result = how you reach the answer. Keep each step tight.
- fullStepByStep (D.E.E.P.): always present, exactly 4 phases in order DIAGNOSE, EXTRACT, EXECUTE, PROOF. DIAGNOSE MUST state the governing principle + key formula.
- conceptNote: 1-2 lines naming the governing concept + formula (original wording).
- distractorRationale: an array of 4 strings — for EACH option, one line on why it is correct or what specific mistake it represents. (This forces verification of every option.)
- workedExamples: 1-2 ORIGINAL worked examples applying the same method to different numbers/context.
- difficulty matches the requested level.

Output JSON shape (keys exactly):
{
 "questionText": string,
 "options": [{"text": string},{"text": string},{"text": string},{"text": string}],
 "correctOptionIndex": 0-3,
 "difficulty": "Easy"|"Medium"|"Hard",
 "fsmTag": "kebab-case-solution-pattern",
 "subtopic": string,
 "concepts": [string],
 "conceptNote": string,
 "distractorRationale": [string,string,string,string],
 "theOptimalPath": {"exists": boolean, "steps": [string]},
 "fullStepByStep": {"phases": [{"label":"DIAGNOSE","content":string},{"label":"EXTRACT","content":string},{"label":"EXECUTE","content":string},{"label":"PROOF","content":string}]},
 "workedExamples": [{"problem": string, "solution": string}],
 "timeTargets": {"ap_eapcet": number, "ts_eapcet": number, "jee_main": number}
}`;

// ---- 20-question matrix (~30/50/20 difficulty mix, spread across subjects) ----
const TASKS = [
  { subject: 'Physics', chapter: 'Laws of Motion', subtopic: "Newton's second law", difficulty: 'Easy' },
  { subject: 'Physics', chapter: 'Motion in a Plane', subtopic: 'Projectile motion', difficulty: 'Medium' },
  { subject: 'Physics', chapter: 'Work, Energy and Power', subtopic: 'Work-energy theorem', difficulty: 'Hard' },
  { subject: 'Physics', chapter: 'Units and Measurements', subtopic: 'Dimensional analysis', difficulty: 'Easy' },
  { subject: 'Physics', chapter: 'Oscillations', subtopic: 'Simple harmonic motion', difficulty: 'Medium' },
  { subject: 'Physics', chapter: 'Gravitation', subtopic: 'Orbital velocity', difficulty: 'Medium' },
  { subject: 'Physics', chapter: 'Thermodynamics', subtopic: 'First law', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Structure of Atom', subtopic: 'Quantum numbers', difficulty: 'Easy' },
  { subject: 'Chemistry', chapter: 'Chemical Bonding', subtopic: 'VSEPR geometry', difficulty: 'Medium' },
  { subject: 'Chemistry', chapter: 'Thermodynamics', subtopic: 'Enthalpy of reaction', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'States of Matter', subtopic: 'Ideal gas equation', difficulty: 'Medium' },
  { subject: 'Chemistry', chapter: 'Stoichiometry', subtopic: 'Mole concept', difficulty: 'Easy' },
  { subject: 'Chemistry', chapter: 'Equilibrium', subtopic: 'Le Chatelier principle', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Sets and Functions', subtopic: 'Domain and range', difficulty: 'Easy' },
  { subject: 'Mathematics', chapter: 'Trigonometry', subtopic: 'Identities', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Complex Numbers', subtopic: 'Modulus and argument', difficulty: 'Hard' },
  { subject: 'Mathematics', chapter: 'Matrices and Determinants', subtopic: 'Determinant properties', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Quadratic Equations', subtopic: 'Nature of roots', difficulty: 'Easy' },
  { subject: 'Mathematics', chapter: 'Sequences and Series', subtopic: 'Arithmetic progression', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Limits and Continuity', subtopic: 'Evaluating limits', difficulty: 'Hard' },
];

function userPrompt(t) {
  return `Exam: AP/TS EAPCET. Subject: ${t.subject}. Chapter: ${t.chapter}. Subtopic: ${t.subtopic}. Difficulty: ${t.difficulty}.
Generate one original ${t.difficulty} MCQ for this subtopic, following all rules. Return only the JSON object.`;
}

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  // Responses API: walk output[].content[].text
  if (Array.isArray(data.output)) {
    const parts = [];
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) if (typeof c.text === 'string') parts.push(c.text);
      }
    }
    if (parts.length) return parts.join('');
  }
  return '';
}

function parseJsonLoose(text) {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  try { return JSON.parse(t); } catch {}
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  return null;
}

function usageOf(data) {
  const u = data.usage || {};
  const reasoning = u.output_tokens_details?.reasoning_tokens
    ?? u.completion_tokens_details?.reasoning_tokens ?? 0;
  return {
    input: u.input_tokens ?? u.prompt_tokens ?? 0,
    output: u.output_tokens ?? u.completion_tokens ?? 0,
    reasoning,
    total: u.total_tokens ?? 0,
  };
}

async function generateOne(task, key, attempt = 1) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM,
        input: userPrompt(task),
        reasoning: { effort: REASONING_EFFORT },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return generateOne(task, key, attempt + 1); }
      return { task, error: data.error?.message || `HTTP ${res.status}`, usage: { input: 0, output: 0, reasoning: 0, total: 0 } };
    }
    const text = extractText(data);
    return { task, json: parseJsonLoose(text), raw: text, usage: usageOf(data) };
  } catch (err) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return generateOne(task, key, attempt + 1); }
    return { task, error: String(err), usage: { input: 0, output: 0, reasoning: 0, total: 0 } };
  }
}

function money(n) { return '$' + n.toFixed(2); }

async function main() {
  const key = readKey();
  if (!key) {
    console.error('No key. Put OPENAI_API_KEY=sk-... in scripts/.env.calibration (gitignored) or export it.');
    process.exit(1);
  }
  console.log(`Generating ${TASKS.length} questions with ${MODEL} (reasoning=${REASONING_EFFORT})...`);
  const results = [];
  for (let i = 0; i < TASKS.length; i++) {
    process.stdout.write(`  [${i + 1}/${TASKS.length}] ${TASKS[i].subject} · ${TASKS[i].subtopic} ... `);
    const r = await generateOne(TASKS[i], key);
    console.log(r.error ? `ERROR: ${r.error}` : `ok (in ${r.usage.input} / out ${r.usage.output} / reasoning ${r.usage.reasoning})`);
    results.push(r);
    if (i < TASKS.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  writeFileSync(join(__dirname, `calibration-output-${MODEL}-${REASONING_EFFORT}.json`), JSON.stringify(results, null, 2));

  const ok = results.filter(r => !r.error);
  const n = ok.length || 1;
  const sum = ok.reduce((a, r) => ({
    input: a.input + r.usage.input, output: a.output + r.usage.output, reasoning: a.reasoning + r.usage.reasoning,
  }), { input: 0, output: 0, reasoning: 0 });
  const avg = { input: sum.input / n, output: sum.output / n, reasoning: sum.reasoning / n };
  const parsedOk = ok.filter(r => r.json).length;

  const costFor = (model, inTok, outTok) => (inTok * PRICES[model].in + outTok * PRICES[model].out) / 1e6;
  const sampleCost = costFor(MODEL, sum.input, sum.output);

  let md = `# OpenAI calibration report\n\n`;
  md += `- Model: \`${MODEL}\`  ·  reasoning: \`${REASONING_EFFORT}\`\n`;
  md += `- Questions requested: ${TASKS.length}  ·  succeeded: ${ok.length}  ·  valid JSON: ${parsedOk}\n\n`;
  md += `## Tokens per question (average)\n`;
  md += `| | input | output (incl. reasoning) | of which reasoning |\n|---|---|---|---|\n`;
  md += `| avg/Q | ${Math.round(avg.input)} | ${Math.round(avg.output)} | ${Math.round(avg.reasoning)} |\n\n`;
  md += `## Cost — this 20-question sample (${MODEL})\n`;
  md += `- input ${sum.input} tok, output ${sum.output} tok → **${money(sampleCost)}** (~${money(sampleCost / n)}/question)\n\n`;
  md += `## Extrapolated cost for ${BATCH_TARGET.toLocaleString()} questions (same avg tokens)\n`;
  md += `| Model | input $/1M | output $/1M | cost for ${BATCH_TARGET.toLocaleString()} |\n|---|---|---|---|\n`;
  for (const m of ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5']) {
    const c = costFor(m, avg.input * BATCH_TARGET, avg.output * BATCH_TARGET);
    md += `| \`${m}\` | ${PRICES[m].in} | ${PRICES[m].out} | **${money(c)}** |\n`;
  }
  md += `\n> Note: premium-model projections assume the SAME token counts as mini. A larger model may emit more reasoning tokens, so treat the gpt-5.4 / gpt-5.5 figures as a lower bound. The Batch API (async) would roughly halve these.\n`;
  writeFileSync(join(__dirname, `calibration-report-${MODEL}-${REASONING_EFFORT}.md`), md);

  console.log('\n' + md);
  console.log(`Wrote scripts/calibration-output-${MODEL}-${REASONING_EFFORT}.json and scripts/calibration-report-${MODEL}-${REASONING_EFFORT}.md`);
}

main();
