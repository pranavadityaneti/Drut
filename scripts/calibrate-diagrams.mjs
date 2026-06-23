#!/usr/bin/env node
/**
 * OpenAI DIAGRAM calibration harness.
 *
 * Generates 9 HARD, figure-dependent questions (3 Physics / 3 Chemistry / 3 Maths)
 * with gpt-5.4-mini @ high reasoning. Each question MUST require and reference a
 * diagram, returned as a self-contained inline SVG that renders in a browser AND
 * in react-native-svg (no <script>, <foreignObject>, external images, or CSS).
 *
 * Measures exact token usage + cost, runs deterministic SVG safety/validity checks,
 * and extracts every SVG to scripts/diagram-svgs/ for visual rendering.
 *
 * KEY HANDLING: read from scripts/.env.calibration (gitignored) or OPENAI_API_KEY.
 * Never hard-coded, never printed.
 *
 * Run:  node scripts/calibrate-diagrams.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- config ----
const MODEL = 'gpt-5.4-mini';
const REASONING_EFFORT = 'high'; // none | low | medium | high | xhigh
const API_URL = 'https://api.openai.com/v1/responses';
const PRICES = {
  'gpt-5.4-mini': { in: 0.75, out: 4.50 },
  'gpt-5.4': { in: 2.50, out: 15.0 },
  'gpt-5.5': { in: 5.0, out: 30.0 },
};
const BATCH_TARGET = 10000;
const DELAY_MS = 700;

// ---- key (gitignored file or env; never hard-coded) ----
function readKey() {
  const envFile = join(__dirname, '.env.calibration');
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.trim().startsWith('OPENAI_API_KEY'));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
  return process.env.OPENAI_API_KEY || '';
}

// ---- generation contract ----
const SYSTEM = `You are Drut's exam-question generator for Indian competitive exams (EAPCET beachhead; NCERT-aligned Class 11/12 Physics, Chemistry, Mathematics).

Produce ONE multiple-choice question as a SINGLE JSON object and NOTHING else (no prose, no markdown fences).

This question is FIGURE-DEPENDENT: it MUST require a diagram to be answered, and the questionText MUST explicitly reference the figure (e.g. "In the figure shown ...", "From the circuit shown ...", "The shaded region in the figure ..."). A student should NOT be able to answer without the diagram.

Hard rules:
- ORIGINAL expression only. Never reproduce textbook wording or a textbook's solved example. Facts/formulas are fine; phrasing and the example problems must be yours.
- Exactly 4 options. Exactly one correct. correctOptionIndex is 0-based.
- Use LaTeX for ALL math, inline as $...$ (e.g. $v^2 = u^2 + 2as$). Use proper LaTeX commands (\\Delta, \\geq, \\times, \\rightarrow), NEVER literal Unicode symbols inside math.
- theOptimalPath (T.A.R.) = the Quick Method, ALWAYS present (exists=true). Exactly 3 steps prefixed "**Trigger:**", "**Action:**", "**Result:**" showing the SIMPLEST fastest clean way to solve THIS problem under exam time pressure.
- fullStepByStep (D.E.E.P.): exactly 4 phases in order DIAGNOSE, EXTRACT, EXECUTE, PROOF. DIAGNOSE MUST state the governing principle + key formula.
- conceptNote: 1-2 lines naming the governing concept + formula (original wording).
- distractorRationale: array of 4 strings — for EACH option, one line on why it is correct or what specific mistake it represents. The stated arithmetic for each wrong option MUST actually yield that option's value.
- workedExamples: 1-2 ORIGINAL worked examples applying the same method to different numbers/context.
- difficulty: "Hard".

DIAGRAM rules (critical):
- Provide diagram.svg: ONE self-contained inline SVG string.
- It MUST render in a browser AND in react-native-svg. Therefore: NO <script>, NO <foreignObject>, NO <style> blocks or CSS classes (use presentation attributes like fill=, stroke=, font-size= directly), NO external resources (no <image href=...>, no web fonts, no @import), NO filters.
- MUST include a viewBox (e.g. viewBox="0 0 400 300") and explicit width/height.
- Use only: line, rect, circle, ellipse, polygon, polyline, path, text, g, marker (for arrowheads), defs (only for markers).
- LABEL every quantity the problem states (angles, lengths, masses, resistances, coordinates, atoms, ions, axes). Numeric/geometric values drawn MUST be consistent with the question (a 30° angle looks ~30°, a labelled length matches the stated ratio).
- Keep all coordinates inside the viewBox. Dark strokes on transparent background, font-size >= 12, colour-blind-safe (no red/green-only distinctions).
- diagram.altText: one-line screen-reader description. diagram.caption: short caption shown under the figure.

Output JSON shape (keys exactly):
{
 "questionText": string,
 "options": [{"text": string},{"text": string},{"text": string},{"text": string}],
 "correctOptionIndex": 0-3,
 "difficulty": "Hard",
 "fsmTag": "kebab-case-solution-pattern",
 "subtopic": string,
 "concepts": [string],
 "conceptNote": string,
 "figureRequired": true,
 "diagram": {"format": "svg", "svg": string, "altText": string, "caption": string},
 "distractorRationale": [string,string,string,string],
 "theOptimalPath": {"exists": boolean, "steps": [string]},
 "fullStepByStep": {"phases": [{"label":"DIAGNOSE","content":string},{"label":"EXTRACT","content":string},{"label":"EXECUTE","content":string},{"label":"PROOF","content":string}]},
 "workedExamples": [{"problem": string, "solution": string}],
 "timeTargets": {"ap_eapcet": number, "ts_eapcet": number, "jee_main": number}
}`;

// ---- 9 figure-dependent HARD tasks ----
const TASKS = [
  { subject: 'Physics', chapter: 'Ray Optics', subtopic: 'Image formation by a concave mirror (ray diagram)', difficulty: 'Hard' },
  { subject: 'Physics', chapter: 'Laws of Motion', subtopic: 'Block on a rough inclined plane (free-body diagram)', difficulty: 'Hard' },
  { subject: 'Physics', chapter: 'Current Electricity', subtopic: 'Equivalent resistance of a resistor network', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Organic Chemistry', subtopic: 'Identify the product / feature from a skeletal structure', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Electrochemistry', subtopic: 'Galvanic cell — EMF / electrode identification', difficulty: 'Hard' },
  { subject: 'Chemistry', chapter: 'Solid State', subtopic: 'Atoms per unit cell from a crystal lattice diagram', difficulty: 'Hard' },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', subtopic: 'Circle, chord and tangent configuration', difficulty: 'Hard' },
  { subject: 'Mathematics', chapter: 'Trigonometry', subtopic: 'Heights and distances (angles of elevation/depression)', difficulty: 'Hard' },
  { subject: 'Mathematics', chapter: 'Integral Calculus', subtopic: 'Area of the region bounded by curves', difficulty: 'Hard' },
];

function userPrompt(t) {
  return `Exam: AP/TS EAPCET. Subject: ${t.subject}. Chapter: ${t.chapter}. Subtopic: ${t.subtopic}. Difficulty: Hard.
Generate one ORIGINAL Hard MCQ that genuinely REQUIRES the diagram (a student cannot answer from the text alone). Include the self-contained SVG diagram per the rules. Return only the JSON object.`;
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
  const reasoning = u.output_tokens_details?.reasoning_tokens
    ?? u.completion_tokens_details?.reasoning_tokens ?? 0;
  return {
    input: u.input_tokens ?? u.prompt_tokens ?? 0,
    output: u.output_tokens ?? u.completion_tokens ?? 0,
    reasoning,
    total: u.total_tokens ?? 0,
  };
}

// ---- deterministic SVG safety/validity check ----
function checkSvg(svg) {
  const c = { present: false, hasSvgTag: false, hasViewBox: false, closed: false, hasText: false, forbidden: [] };
  if (typeof svg !== 'string' || !svg.trim()) return c;
  c.present = true;
  c.hasSvgTag = /<svg[\s>]/i.test(svg);
  c.hasViewBox = /viewBox\s*=/.test(svg);
  c.closed = /<\/svg>/i.test(svg);
  c.hasText = /<text[\s>]/i.test(svg);
  const banned = [
    [/<script[\s>]/i, 'script'],
    [/<foreignObject[\s>]/i, 'foreignObject'],
    [/<style[\s>]/i, 'style-block'],
    [/<image[\s>]/i, 'image'],
    [/href\s*=\s*["']?https?:/i, 'external-href'],
    [/@import/i, 'css-import'],
    [/<filter[\s>]/i, 'filter'],
    [/\sclass\s*=/i, 'css-class'],
  ];
  for (const [re, name] of banned) if (re.test(svg)) c.forbidden.push(name);
  return c;
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
    const json = parseJsonLoose(text);
    const svgCheck = checkSvg(json?.diagram?.svg);
    return { task, json, raw: text, usage: usageOf(data), svgCheck };
  } catch (err) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return generateOne(task, key, attempt + 1); }
    return { task, error: String(err), usage: { input: 0, output: 0, reasoning: 0, total: 0 } };
  }
}

function money(n) { return '$' + n.toFixed(2); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function main() {
  const key = readKey();
  if (!key) {
    console.error('No key. Put OPENAI_API_KEY=sk-... in scripts/.env.calibration (gitignored) or export it.');
    process.exit(1);
  }
  console.log(`Generating ${TASKS.length} figure-dependent questions with ${MODEL} (reasoning=${REASONING_EFFORT})...`);
  const results = [];
  for (let i = 0; i < TASKS.length; i++) {
    process.stdout.write(`  [${i + 1}/${TASKS.length}] ${TASKS[i].subject} · ${TASKS[i].subtopic} ... `);
    const r = await generateOne(TASKS[i], key);
    if (r.error) {
      console.log(`ERROR: ${r.error}`);
    } else {
      const sc = r.svgCheck || {};
      const flags = [];
      if (!sc.present) flags.push('NO-SVG');
      if (sc.present && !sc.hasViewBox) flags.push('no-viewBox');
      if (sc.forbidden?.length) flags.push('forbidden:' + sc.forbidden.join(','));
      console.log(`ok (in ${r.usage.input} / out ${r.usage.output} / reasoning ${r.usage.reasoning})` + (flags.length ? `  [${flags.join(' ')}]` : '  [svg ok]'));
    }
    results.push(r);
    if (i < TASKS.length - 1) await new Promise(res => setTimeout(res, DELAY_MS));
  }

  writeFileSync(join(__dirname, `diagram-output-${MODEL}-${REASONING_EFFORT}.json`), JSON.stringify(results, null, 2));

  // extract SVGs to files for rendering
  const svgDir = join(__dirname, 'diagram-svgs');
  mkdirSync(svgDir, { recursive: true });
  let extracted = 0;
  results.forEach((r, i) => {
    const svg = r.json?.diagram?.svg;
    if (typeof svg === 'string' && svg.includes('<svg')) {
      const name = `q${i + 1}-${slug(r.task.subject)}-${slug(r.task.subtopic).slice(0, 24)}.svg`;
      writeFileSync(join(svgDir, name), svg, 'utf8');
      extracted++;
    }
  });

  const ok = results.filter(r => !r.error);
  const n = ok.length || 1;
  const sum = ok.reduce((a, r) => ({
    input: a.input + r.usage.input, output: a.output + r.usage.output, reasoning: a.reasoning + r.usage.reasoning,
  }), { input: 0, output: 0, reasoning: 0 });
  const avg = { input: sum.input / n, output: sum.output / n, reasoning: sum.reasoning / n };
  const parsedOk = ok.filter(r => r.json).length;
  const withSvg = ok.filter(r => r.svgCheck?.present).length;
  const cleanSvg = ok.filter(r => r.svgCheck?.present && r.svgCheck.hasViewBox && r.svgCheck.closed && !r.svgCheck.forbidden.length).length;

  const costFor = (model, inTok, outTok) => (inTok * PRICES[model].in + outTok * PRICES[model].out) / 1e6;
  const sampleCost = costFor(MODEL, sum.input, sum.output);

  let md = `# OpenAI DIAGRAM calibration report\n\n`;
  md += `- Model: \`${MODEL}\`  ·  reasoning: \`${REASONING_EFFORT}\`\n`;
  md += `- Questions requested: ${TASKS.length}  ·  succeeded: ${ok.length}  ·  valid JSON: ${parsedOk}\n`;
  md += `- With SVG diagram: ${withSvg}/${ok.length}  ·  passing deterministic SVG checks (viewBox + closed + no forbidden tags): ${cleanSvg}/${ok.length}\n\n`;
  md += `## Tokens per question (average)\n`;
  md += `| | input | output (incl. reasoning) | of which reasoning |\n|---|---|---|---|\n`;
  md += `| avg/Q | ${Math.round(avg.input)} | ${Math.round(avg.output)} | ${Math.round(avg.reasoning)} |\n\n`;
  md += `## Cost — this ${TASKS.length}-question sample (${MODEL})\n`;
  md += `- input ${sum.input} tok, output ${sum.output} tok → **${money(sampleCost)}** (~${money(sampleCost / n)}/question)\n\n`;
  md += `## Extrapolated cost for ${BATCH_TARGET.toLocaleString()} figure-questions (same avg tokens)\n`;
  md += `| Model | input $/1M | output $/1M | cost for ${BATCH_TARGET.toLocaleString()} |\n|---|---|---|---|\n`;
  for (const m of ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5']) {
    const c = costFor(m, avg.input * BATCH_TARGET, avg.output * BATCH_TARGET);
    md += `| \`${m}\` | ${PRICES[m].in} | ${PRICES[m].out} | **${money(c)}** |\n`;
  }
  md += `\n## Per-question SVG check\n`;
  md += `| # | Subject | Subtopic | SVG | viewBox | closed | text-labels | forbidden |\n|---|---|---|---|---|---|---|---|\n`;
  results.forEach((r, i) => {
    if (r.error) { md += `| ${i + 1} | ${r.task.subject} | ${r.task.subtopic} | ERROR | | | | |\n`; return; }
    const sc = r.svgCheck || {};
    md += `| ${i + 1} | ${r.task.subject} | ${r.task.subtopic} | ${sc.present ? 'yes' : 'NO'} | ${sc.hasViewBox ? 'y' : 'n'} | ${sc.closed ? 'y' : 'n'} | ${sc.hasText ? 'y' : 'n'} | ${sc.forbidden?.length ? sc.forbidden.join(',') : '-'} |\n`;
  });
  md += `\n> SVGs extracted to scripts/diagram-svgs/ for visual rendering. Deterministic checks confirm structure/safety only — visual correctness and accuracy-to-problem require rendering + audit.\n`;
  writeFileSync(join(__dirname, `diagram-report-${MODEL}-${REASONING_EFFORT}.md`), md);

  console.log('\n' + md);
  console.log(`Wrote diagram-output-${MODEL}-${REASONING_EFFORT}.json, diagram-report-${MODEL}-${REASONING_EFFORT}.md, and ${extracted} SVGs to scripts/diagram-svgs/`);
}

main();
