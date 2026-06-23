#!/usr/bin/env node
/**
 * OpenAI REVISED-FORMAT calibration.
 *
 * 10 text questions (2 Easy / 4 Medium / 4 Hard; Physics x4, Chemistry x3, Maths x3)
 * with gpt-5.4-mini @ high, in the APPROVED format:
 *   - Quick Method = 3 clean steps, NO framework labels (no Trigger/Action/Result).
 *   - Full Solution = concept-led, flowing "B+C mix" chunks, NO labels, NO numbers;
 *     each chunk = { text, display? } where display is the chunk's pivotal equation.
 *   - LaTeX hygiene: real commands (\Delta, \geq, \times), never literal Unicode math.
 *   - NO worked examples in this batch.
 *
 * Measures exact token usage + cost. KEY read from scripts/.env.calibration (gitignored).
 * Run:  node scripts/calibrate-format.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- config ----
const MODEL = 'gpt-5.4-mini';
const REASONING_EFFORT = 'high';
const API_URL = 'https://api.openai.com/v1/responses';
const PRICES = {
  'gpt-5.4-mini': { in: 0.75, out: 4.50 },
  'gpt-5.4': { in: 2.50, out: 15.0 },
  'gpt-5.5': { in: 5.0, out: 30.0 },
};
const BATCH_TARGET = 10000;
const DELAY_MS = 700;

function readKey() {
  const envFile = join(__dirname, '.env.calibration');
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.trim().startsWith('OPENAI_API_KEY'));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
  return process.env.OPENAI_API_KEY || '';
}

// ---- the approved generation contract ----
const SYSTEM = `You are Drut's exam-question generator for Indian competitive exams (EAPCET beachhead; NCERT-aligned Class 11/12 Physics, Chemistry, Mathematics).

Produce ONE multiple-choice question as a SINGLE JSON object and NOTHING else (no prose, no markdown fences).

CONTENT
- ORIGINAL expression only. Never reproduce textbook wording or a textbook's solved example. Facts/formulas are fine; the phrasing and example problems must be yours.
- Exactly 4 options. Exactly one correct. correctOptionIndex is 0-based.
- difficulty must match the requested level.
- ALL math in LaTeX, inline as $...$. Use proper LaTeX commands (\\Delta, \\geq, \\le, \\times, \\rightarrow, \\frac, \\sqrt, \\theta, \\mu). NEVER paste literal Unicode math symbols (Δ, ≥, ×, →, θ, μ, √) inside math.

QUICK METHOD (the fast exam solve)
- quickMethod.steps: EXACTLY 3 short, clean steps — the fastest reliable way to solve THIS problem under time pressure, written as plain direct instructions a student reads and acts on.
- DO NOT label the steps. NEVER output the words "Trigger", "Action", "Result", or any framework label. (You may reason in a recognise -> do -> conclude structure internally; the words must not appear in the output.)

FULL SOLUTION (teach it properly — detailed, flowing)
- fullSolution.approach: 1-2 lines naming the governing concept/principle and why this method is the right route. This OPENS the solution (the concept lives here, not in a separate section).
- fullSolution.steps: an ORDERED list of flowing chunks — as many as the problem genuinely needs (typically 4-12; more for Hard, fewer for Easy). DO NOT force a fixed count and DO NOT compress.
    - Write each chunk as 1-3 flowing sentences that carry the reasoning forward with connective language ("Since...", "Substituting...", "This gives..."). NO step numbers, NO bold step headers, NO framework labels.
    - Each chunk is an object { text, display }:
        text    = the flowing sentences (inline math as $...$).
        display = OPTIONAL. The single pivotal equation for that chunk as a LaTeX string WITHOUT $ delimiters (the app centers it on its own line). Include only when there is a key equation to highlight; OMIT (empty string) for purely verbal chunks.
- Show every non-trivial intermediate result; never skip algebra.
- fullSolution.answer: state the final answer plainly (value + option letter).
- NEVER output "Diagnose", "Extract", "Execute", "Proof", or any framework label anywhere.
- DO NOT include worked examples in this batch.

DISTRACTORS
- distractorRationale: an array of 4 strings — for EACH option, one line on why it is correct or the specific mistake it represents. The stated arithmetic for each wrong option MUST actually produce that option's value.

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
 "fullSolution": {
   "approach": string,
   "steps": [{"text": string, "display": string}],
   "answer": string
 },
 "distractorRationale": [string, string, string, string],
 "timeTargets": {"ap_eapcet": number, "ts_eapcet": number, "jee_main": number}
}`;

// ---- 10-question matrix (2E / 4M / 4H; Physics x4, Chemistry x3, Maths x3) ----
const TASKS = [
  { subject: 'Physics', chapter: 'Motion in a Straight Line', subtopic: 'Equations of uniformly accelerated motion', difficulty: 'Easy' },
  { subject: 'Chemistry', chapter: 'Some Basic Concepts of Chemistry', subtopic: 'Mole concept and limiting reagent', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Quadratic Equations', subtopic: 'Nature of roots (discriminant)', difficulty: 'Medium' },
  { subject: 'Physics', chapter: 'Laws of Motion', subtopic: 'Connected blocks with friction', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Thermodynamics', subtopic: "Hess's law / enthalpy of reaction", difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Structure of Atom', subtopic: 'Quantum numbers', difficulty: 'Easy' },
  { subject: 'Physics', chapter: 'Motion in a Plane', subtopic: 'Projectile motion — range and time of flight', difficulty: 'Medium' },
  { subject: 'Mathematics', chapter: 'Trigonometry', subtopic: 'Trigonometric identities and equations', difficulty: 'Medium' },
  { subject: 'Physics', chapter: 'Oscillations', subtopic: 'Energy in simple harmonic motion', difficulty: 'Hard' },
  { subject: 'Mathematics', chapter: 'Sequences and Series', subtopic: 'Sum to n terms (AP/GP)', difficulty: 'Hard' },
];

function userPrompt(t) {
  return `Exam: AP/TS EAPCET. Subject: ${t.subject}. Chapter: ${t.chapter}. Subtopic: ${t.subtopic}. Difficulty: ${t.difficulty}.
Generate one original ${t.difficulty} MCQ for this subtopic in the required format (clean Quick Method + flowing chunked Full Solution, NO worked examples). Return only the JSON object.`;
}

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
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
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch {}
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  return null;
}

function usageOf(data) {
  const u = data.usage || {};
  const reasoning = u.output_tokens_details?.reasoning_tokens ?? u.completion_tokens_details?.reasoning_tokens ?? 0;
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
      body: JSON.stringify({ model: MODEL, instructions: SYSTEM, input: userPrompt(task), reasoning: { effort: REASONING_EFFORT } }),
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
  if (!key) { console.error('No key in scripts/.env.calibration or OPENAI_API_KEY.'); process.exit(1); }
  console.log(`Generating ${TASKS.length} questions (revised format, no examples) with ${MODEL} (reasoning=${REASONING_EFFORT})...`);
  const results = [];
  for (let i = 0; i < TASKS.length; i++) {
    process.stdout.write(`  [${i + 1}/${TASKS.length}] ${TASKS[i].subject} · ${TASKS[i].difficulty} · ${TASKS[i].subtopic} ... `);
    const r = await generateOne(TASKS[i], key);
    if (r.error) console.log(`ERROR: ${r.error}`);
    else {
      const fs2 = r.json?.fullSolution;
      const nSteps = Array.isArray(fs2?.steps) ? fs2.steps.length : 0;
      const ok3 = Array.isArray(r.json?.quickMethod?.steps) && r.json.quickMethod.steps.length === 3;
      console.log(`ok (in ${r.usage.input} / out ${r.usage.output} / reasoning ${r.usage.reasoning})  [solSteps:${nSteps} quick3:${ok3 ? 'y' : 'NO'}]`);
    }
    results.push(r);
    if (i < TASKS.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  writeFileSync(join(__dirname, `format-output-${MODEL}-${REASONING_EFFORT}.json`), JSON.stringify(results, null, 2));

  const ok = results.filter(r => !r.error);
  const n = ok.length || 1;
  const sum = ok.reduce((a, r) => ({ input: a.input + r.usage.input, output: a.output + r.usage.output, reasoning: a.reasoning + r.usage.reasoning }), { input: 0, output: 0, reasoning: 0 });
  const avg = { input: sum.input / n, output: sum.output / n, reasoning: sum.reasoning / n };
  const parsedOk = ok.filter(r => r.json).length;
  const costFor = (m, inTok, outTok) => (inTok * PRICES[m].in + outTok * PRICES[m].out) / 1e6;
  const sampleCost = costFor(MODEL, sum.input, sum.output);

  let md = `# OpenAI revised-format calibration report\n\n`;
  md += `- Model: \`${MODEL}\`  ·  reasoning: \`${REASONING_EFFORT}\`  ·  format: B+C mix, no worked examples\n`;
  md += `- Questions: ${TASKS.length}  ·  succeeded: ${ok.length}  ·  valid JSON: ${parsedOk}\n\n`;
  md += `## Tokens per question (average)\n| | input | output (incl. reasoning) | of which reasoning |\n|---|---|---|---|\n`;
  md += `| avg/Q | ${Math.round(avg.input)} | ${Math.round(avg.output)} | ${Math.round(avg.reasoning)} |\n\n`;
  md += `## Cost — this ${TASKS.length}-question sample (${MODEL})\n- input ${sum.input} tok, output ${sum.output} tok → **${money(sampleCost)}** (~${money(sampleCost / n)}/question)\n\n`;
  md += `## Extrapolated cost for ${BATCH_TARGET.toLocaleString()} questions (same avg tokens)\n| Model | in $/1M | out $/1M | cost for ${BATCH_TARGET.toLocaleString()} |\n|---|---|---|---|\n`;
  for (const m of ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5']) {
    md += `| \`${m}\` | ${PRICES[m].in} | ${PRICES[m].out} | **${money(costFor(m, avg.input * BATCH_TARGET, avg.output * BATCH_TARGET))}** |\n`;
  }
  md += `\n> vs. old brief format baseline: $389/10k. Detailed solutions cost more output tokens.\n`;
  writeFileSync(join(__dirname, `format-report-${MODEL}-${REASONING_EFFORT}.md`), md);
  console.log('\n' + md);
  console.log(`Wrote scripts/format-output-${MODEL}-${REASONING_EFFORT}.json and scripts/format-report-${MODEL}-${REASONING_EFFORT}.md`);
}

main();
