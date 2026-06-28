#!/usr/bin/env node
/**
 * Reconcile every SERVABLE question onto the single canonical AP (BIEAP) chapter
 * taxonomy (EXAM_TAXONOMY) — bare labels, NCERT names dropped. This is the
 * "one source of truth" hardening: after this, no served row sits on a
 * non-canonical / NCERT-named topic.
 *
 * Per row (servable = new-format + status in {ai-openai-audited, v3-verified-pyq}):
 *   - strip any "Chapter N:" prefix.
 *   - if the result is already a canonical AP chapter for that subject -> KEEP/RENAME.
 *   - else -> RE-TAG: classify into the subject's canonical list via gpt-5.4 double-pass
 *     (agree + not-low => assign; disagree/low/UNCERTAIN => QUARANTINE, left untouched
 *     for human review — never guessed).
 *
 * SAFETY: DRY_RUN default ON (prints the full old->new plan, writes a backup, no DB write).
 *   Backup of every affected row's {id, old topic} is written first (restorable).
 *   Run (dry):   node scripts/retag-servable.mjs
 *   Run (write): DRY_RUN=false node scripts/retag-servable.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const calEnv = (() => { const o = {}; const p = join(ROOT, 'scripts/.env.calibration'); if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const webEnv = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SUPA = webEnv.NEXT_PUBLIC_SUPABASE_URL, SK = webEnv.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };
const DRY_RUN = process.env.DRY_RUN !== 'false';
const MODEL = process.env.MODEL || 'gpt-5.4';

// ---- canonical AP chapter list per subject (from EXAM_TAXONOMY) ----
function canonBySubject() {
  const txt = readFileSync(join(ROOT, 'packages/shared/src/lib/taxonomy.ts'), 'utf8');
  const re = /subject:\s*["']([^"']+)["'],\s+label:\s*["']([^"']+)["']/g;
  const out = {}; let m;
  while ((m = re.exec(txt))) { (out[m[1]] = out[m[1]] || new Set()).add(m[2]); }
  return out;
}
const CANON = canonBySubject();

// Deterministic 1:1 renames (NCERT/variant name -> canonical BIEAP chapter). These
// are pure name-normalizations — NOT content-dependent — so they bypass the LLM
// entirely (the LLM occasionally mis-guesses these, e.g. Circles->Locus). Redox is
// included because BIEAP folds redox into the Stoichiometry unit.
const ALIAS = {
  'Hydrogen and its Compounds': 'Hydrogen and Its Compounds',
  'Definite Integration': 'Definite Integrals',
  'Straight Lines': 'The Straight Line',
  'Circles': 'Circle',
  'The s-Block Elements': 's-Block Elements (Alkali and Alkaline Earth Metals)',
  'States of Matter': 'States of Matter: Gases and Liquids',
  'Equilibrium': 'Chemical Equilibrium and Acids-Bases',
  'Classification of Elements and Periodicity': 'Classification of Elements and Periodicity in Properties',
  'The p-Block Elements': 'p-Block Elements (Groups 15-18)',
  'The d- and f-Block Elements': 'd- and f-Block Elements and Coordination Compounds',
  'Coordination Compounds': 'd- and f-Block Elements and Coordination Compounds',
  'Redox Reactions': 'Stoichiometry',
};

function extractTextR(d) { if (typeof d.output_text === 'string' && d.output_text) return d.output_text; if (Array.isArray(d.output)) { const p = []; for (const it of d.output) if (Array.isArray(it.content)) for (const c of it.content) if (typeof c.text === 'string') p.push(c.text); if (p.length) return p.join(''); } return ''; }
function parseJsonLoose(t) { let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(); try { return JSON.parse(s); } catch {} const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} } return null; }

async function classifyOnce(q, subject, attempt = 1) {
  const names = [...CANON[subject]];
  const sys = `You classify an AP EAPCET ${subject} multiple-choice question into EXACTLY ONE chapter from the allowed list. Classify by the CORE CONCEPT tested, not surface keywords.\n\nALLOWED CHAPTERS (copy one verbatim, or "UNCERTAIN"):\n${names.map(n => `- ${n}`).join('\n')}\n\nReturn ONLY JSON: { "chapter": "<exact string or UNCERTAIN>", "confidence": "high"|"medium"|"low" }`;
  try {
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, instructions: sys, input: `Question: ${q.questionText}\n\nOptions:\n${(q.options || []).map((o, i) => `(${'ABCD'[i]}) ${o.en || o.text}`).join('\n')}`, reasoning: { effort: 'medium' } }) });
    const d = await res.json();
    if (!res.ok) { if (attempt < 2) { await new Promise(r => setTimeout(r, 1200)); return classifyOnce(q, subject, attempt + 1); } return { error: d.error?.message || `HTTP ${res.status}` }; }
    return { json: parseJsonLoose(extractTextR(d)) };
  } catch (e) { if (attempt < 2) { await new Promise(r => setTimeout(r, 1200)); return classifyOnce(q, subject, attempt + 1); } return { error: String(e) }; }
}

async function fetchServable() {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${SUPA}/rest/v1/cached_questions?select=id,topic,subject,question_data&question_data->quickMethod=not.is.null&question_data->fullSolution=not.is.null&verification_status=in.(ai-openai-audited,v3-verified-pyq)`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const j = await r.json(); if (!Array.isArray(j) || !j.length) break; out = out.concat(j); if (j.length < 1000) break; from += 1000;
  }
  return out;
}
async function patchTopic(id, topic) {
  const r = await fetch(`${SUPA}/rest/v1/cached_questions?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ topic }) });
  return r.ok ? { ok: true } : { ok: false, error: `${r.status}: ${(await r.text()).slice(0, 120)}` };
}

(async () => {
  if (!OPENAI_API_KEY || !SUPA || !SK) { console.error('Missing keys'); process.exit(1); }
  const rows = await fetchServable();
  console.log(`\nReconcile servable topics -> canonical AP — DRY_RUN: ${DRY_RUN} · model ${MODEL}`);
  console.log(`Canonical AP chapters: Maths ${CANON.Mathematics?.size}, Physics ${CANON.Physics?.size}, Chemistry ${CANON.Chemistry?.size}`);
  console.log(`Servable rows: ${rows.length}\n`);

  writeFileSync(join(ROOT, 'scripts', `.backup-retag-servable-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`), JSON.stringify(rows.map(r => ({ id: r.id, topic: r.topic, subject: r.subject })), null, 2));

  const RANK = { high: 3, medium: 2, low: 1 };
  const keep = [], renames = [], retags = [], quarantine = [];
  for (const r of rows) {
    const subj = r.subject; const set = CANON[subj];
    if (!set) { quarantine.push({ id: r.id, topic: r.topic, reason: `unknown subject ${subj}` }); continue; }
    const stripped = String(r.topic || '').replace(/^Chapter\s+\d+\s*:\s*/, '').trim();
    if (set.has(stripped)) { if (stripped === r.topic) keep.push(r); else renames.push({ id: r.id, old: r.topic, neu: stripped }); continue; }
    // deterministic alias (pure rename, no LLM)
    if (ALIAS[stripped] && set.has(ALIAS[stripped])) { retags.push({ id: r.id, old: r.topic, neu: ALIAS[stripped], subject: subj, conf: 'alias' }); continue; }
    // needs re-tag (genuinely ambiguous → LLM, HIGH-confidence agreement only)
    const q = r.question_data || {};
    const [a, b] = await Promise.all([classifyOnce(q, subj), classifyOnce(q, subj)]);
    const ca = a.json, cb = b.json;
    const agree = ca && cb && ca.chapter === cb.chapter && ca.chapter !== 'UNCERTAIN' && set.has(ca.chapter);
    const conf = agree ? (RANK[ca.confidence] <= RANK[cb.confidence] ? ca.confidence : cb.confidence) : 'low';
    if (agree && conf === 'high') retags.push({ id: r.id, old: r.topic, neu: ca.chapter, subject: subj, conf });
    else quarantine.push({ id: r.id, topic: r.topic, subject: subj, p1: ca?.chapter, p2: cb?.chapter, reason: 'no-agreement' });
    process.stdout.write('.');
  }
  console.log('\n');

  console.log(`KEEP (already canonical): ${keep.length}`);
  console.log(`\nRENAME (strip "Chapter N:") — ${renames.length}:`);
  renames.forEach(x => console.log(`  "${x.old}" -> "${x.neu}"`));
  console.log(`\nRE-TAG (NCERT/non-canonical -> AP) — ${retags.length}:`);
  retags.forEach(x => console.log(`  [${x.subject}] "${x.old}" -> "${x.neu}" (${x.conf})`));
  console.log(`\nQUARANTINE (left untouched, needs your review) — ${quarantine.length}:`);
  quarantine.forEach(x => console.log(`  [${x.subject || '?'}] "${x.topic}"  p1="${x.p1}" p2="${x.p2}"`));

  const writes = [...renames, ...retags];
  if (!DRY_RUN) {
    let ok = 0, fail = 0;
    for (const w of writes) { const r = await patchTopic(w.id, w.neu); if (r.ok) ok++; else { fail++; console.log(`  WRITE-FAIL ${w.id}: ${r.error}`); } await new Promise(rr => setTimeout(rr, 50)); }
    console.log(`\nWRITTEN: ${ok} topics updated, ${fail} failed. (${quarantine.length} quarantined, untouched)`);
  } else {
    console.log(`\nDRY — nothing written. ${writes.length} rows would change (${renames.length} rename + ${retags.length} re-tag); ${quarantine.length} quarantined.`);
    console.log(`Re-run with DRY_RUN=false to apply.`);
  }
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
