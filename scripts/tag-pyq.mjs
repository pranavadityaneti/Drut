#!/usr/bin/env node
/**
 * PYQ chapter tagger — gated, closed-set, double-pass.
 *
 * Mis-tagging is the highest-risk step (a question under the wrong chapter pollutes
 * the wrong practice set), so tagging gets special care:
 *   1. CLOSED SET — the model may pick ONLY from the exact canonical chapter list
 *      (knowledge_nodes for the exam's board, per subject). No free-text, so the tag
 *      always matches a real, servable chapter bucket.
 *   2. STRONGER MODEL (gpt-5.4) + DOUBLE PASS — classify twice, independently. Agree
 *      => tagged. Disagree => quarantined (never silently filed wrong).
 *   3. CONFIDENCE + ABSTAIN — low confidence or "no chapter fits" => quarantined.
 *   (4. Human confirm happens later in the admin AI Review card — chapter shown + editable.)
 *
 * Reads:  scripts/extract-pyq-output.json   (dedups by questionNumber on load)
 * Writes: scripts/tag-pyq-output.json        (tagged + quarantined)
 * Run: SUBJECT=Mathematics node scripts/tag-pyq.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const calEnv = (() => { const o = {}; const p = join(ROOT, 'scripts/.env.calibration'); if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const webEnv = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SUPA = webEnv.NEXT_PUBLIC_SUPABASE_URL, SK = webEnv.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}` };

const SUBJECT = process.env.SUBJECT || 'Mathematics';
const MODEL = process.env.MODEL || 'gpt-5.4';
const SOURCE = process.env.SOURCE || 'knowledge_nodes'; // 'taxonomy' = full EXAM_TAXONOMY list (proof); 'knowledge_nodes' = DB

// Parse the full chapter list from EXAM_TAXONOMY (taxonomy.ts) — the complete
// syllabus list (both years), used for the task-1 proof that a complete closed
// set fixes tagging. (Authoritative BIEAP naming is task 2.)
function fetchChaptersFromTaxonomy(subject) {
  const txt = readFileSync(join(ROOT, 'packages/shared/src/lib/taxonomy.ts'), 'utf8');
  const re = /subject:\s*'([^']+)',\s+label:\s*'([^']+)'/g;
  const out = []; const seen = new Set(); let m;
  while ((m = re.exec(txt))) { if (m[1] !== subject) continue; if (seen.has(m[2])) continue; seen.add(m[2]); out.push({ name: m[2], board: 'EAPCET', class: '?' }); }
  return out;
}
// AP EAPCET primary board = BIEAP (1st year ingested); 2nd-year/Chemistry fall back to NCERT.
// Candidate set per subject = BIEAP (primary) + NCERT class-12 (2nd-year coverage).
const BOARD_PLAN = {
  Mathematics: [{ board: 'BIEAP', class: '11' }, { board: 'NCERT', class: '12' }],
  Physics: [{ board: 'BIEAP', class: '11' }, { board: 'NCERT', class: '12' }],
  Chemistry: [{ board: 'NCERT', class: '11' }, { board: 'NCERT', class: '12' }],
};

async function fetchChapters(subject) {
  const r = await fetch(`${SUPA}/rest/v1/knowledge_nodes?select=name,metadata&node_type=eq.topic`, { headers: H });
  const rows = await r.json();
  const want = BOARD_PLAN[subject] || [];
  const out = [];
  for (const n of (Array.isArray(rows) ? rows : [])) {
    const m = n.metadata || {};
    if (m.subject !== subject) continue;
    if (want.some(w => w.board === m.board && String(w.class) === String(m.class))) {
      out.push({ name: n.name, board: m.board, class: m.class });
    }
  }
  // de-dup by name (BIEAP wins if a name collides)
  const seen = new Map();
  for (const c of out) if (!seen.has(c.name) || c.board === 'BIEAP') seen.set(c.name, c);
  return [...seen.values()];
}

function extractText(d) { if (typeof d.output_text === 'string' && d.output_text) return d.output_text; if (Array.isArray(d.output)) { const p = []; for (const it of d.output) if (Array.isArray(it.content)) for (const c of it.content) if (typeof c.text === 'string') p.push(c.text); if (p.length) return p.join(''); } return ''; }
function parseJsonLoose(t) { let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(); try { return JSON.parse(s); } catch {} const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} } return null; }

function sysPrompt(chapterNames) {
  return `You classify an AP EAPCET ${SUBJECT} multiple-choice question into EXACTLY ONE chapter from the allowed list. Classify by the CORE CONCEPT the question tests, not by surface keywords.

ALLOWED CHAPTERS (you MUST copy one of these strings verbatim, or use "UNCERTAIN"):
${chapterNames.map(n => `- ${n}`).join('\n')}

Return ONLY JSON:
{ "chapter": "<exact string from the list, or UNCERTAIN>",
  "runnerUp": "<second-best exact string, or empty>",
  "confidence": "high"|"medium"|"low",
  "reasoning": "<one sentence: the concept tested>" }
Use "UNCERTAIN" if no chapter genuinely fits or it spans several equally.`;
}

async function classifyOnce(q, chapterNames, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, instructions: sysPrompt(chapterNames), input: `Question: ${q.questionText}\n\nOptions:\n${q.options.map((o, i) => `(${'ABCD'[i]}) ${o.en || o.text}`).join('\n')}`, reasoning: { effort: 'low' }, max_output_tokens: 2000 }),
    });
    const d = await res.json();
    if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1500)); return classifyOnce(q, chapterNames, attempt + 1); } return { error: d.error?.message || `HTTP ${res.status}` }; }
    const j = parseJsonLoose(extractText(d));
    if (!j && attempt < 3) { await new Promise(r => setTimeout(r, 1000)); return classifyOnce(q, chapterNames, attempt + 1); } // retry empty/unparsed
    return { json: j };
  } catch (e) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1500)); return classifyOnce(q, chapterNames, attempt + 1); } return { error: String(e) }; }
}

(async () => {
  if (!OPENAI_API_KEY || !SUPA || !SK) { console.error('Missing keys'); process.exit(1); }
  const raw = JSON.parse(readFileSync(join(ROOT, 'scripts', 'extract-pyq-output.json'), 'utf8')).questions || [];

  // dedup by questionNumber (2-page windows make numbers reliable; keep highest confidence)
  const RANK = { high: 3, medium: 2, low: 1 };
  const byNum = new Map();
  for (const q of raw) {
    if (q.subject !== SUBJECT) continue;
    const k = q.questionNumber;
    if (!byNum.has(k) || (RANK[q.confidence] || 0) > (RANK[byNum.get(k).confidence] || 0)) byNum.set(k, q);
  }
  const questions = [...byNum.values()].sort((a, b) => a.questionNumber - b.questionNumber);

  const chapters = SOURCE === 'taxonomy' ? fetchChaptersFromTaxonomy(SUBJECT) : await fetchChapters(SUBJECT);
  const names = chapters.map(c => c.name);
  const boardOf = new Map(chapters.map(c => [c.name, c.board]));
  const boards = {}; chapters.forEach(c => boards[c.board] = (boards[c.board] || 0) + 1);
  console.log(`\nPYQ tagging — ${SUBJECT} · model ${MODEL} · double-pass · source=${SOURCE}`);
  console.log(`Candidate chapters (${names.length}): ${Object.entries(boards).map(([b, n]) => `${n} ${b}`).join(' + ')}`);
  console.log(`Questions to tag (deduped by number): ${questions.length}\n`);

  const tagged = [], quarantined = [];
  for (const q of questions) {
    const a = await classifyOnce(q, names);   // sequential passes — avoid rate-limit bursts
    const b = await classifyOnce(q, names);
    const ca = a.json, cb = b.json;
    const agree = ca && cb && ca.chapter === cb.chapter && ca.chapter !== 'UNCERTAIN';
    const conf = agree ? (RANK[ca.confidence] <= RANK[cb.confidence] ? ca.confidence : cb.confidence) : 'low';
    const rec = { questionNumber: q.questionNumber, questionText: q.questionText, correctOptionIndex: q.correctOptionIndex,
      pass1: ca?.chapter, pass2: cb?.chapter, chapter: agree ? ca.chapter : null, board: agree ? boardOf.get(ca.chapter) : null, confidence: conf, runnerUp: ca?.runnerUp };
    if (agree && conf !== 'low') { tagged.push(rec); console.log(`  Q${q.questionNumber}  ✓ ${rec.chapter} (${rec.board}, ${conf})`); }
    else { quarantined.push(rec); console.log(`  Q${q.questionNumber}  ⚠ QUARANTINE — p1="${ca?.chapter}" p2="${cb?.chapter}"`); }
    await new Promise(r => setTimeout(r, 200));
  }

  writeFileSync(join(ROOT, 'scripts', 'tag-pyq-output.json'), JSON.stringify({ subject: SUBJECT, candidateChapters: names, tagged, quarantined }, null, 2));
  console.log(`\nTagged confidently: ${tagged.length} · Quarantined (needs your review): ${quarantined.length}`);
  const dist = {}; tagged.forEach(t => dist[`${t.chapter} [${t.board}]`] = (dist[`${t.chapter} [${t.board}]`] || 0) + 1);
  console.log(`\nChapter distribution (confident tags):`);
  Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(`  ${String(c).padStart(2)}  ${k}`));
  console.log(`\nOutput: scripts/tag-pyq-output.json`);
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
