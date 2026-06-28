#!/usr/bin/env node
/**
 * PHASE 2 — empirical difficulty via online Elo / 1PL-Rasch rating.
 *
 * WHY THIS DESIGN (from research, all high-confidence/verified):
 *  - Difficulty cannot be reliably labelled before data: human experts explain only
 *    ~33% of empirical difficulty variance (and get WORSE with expertise — curse of
 *    knowledge), and the best LLM text systems barely beat a mean-prediction baseline.
 *  - The proven production approach (Duolingo "Birdbrain") is a logistic / IRT model
 *    fit online by SGD — explicitly "a generalization of the Elo rating system": each
 *    question has a difficulty rating, each learner an ability rating; every answer
 *    nudges both. It converges in TENS of attempts (not the ~200/item full IRT needs)
 *    and corrects for WHO answered (raw % cannot).
 *
 * This is exactly a 1PL/Rasch fit by SGD:
 *    P(user correct) = sigmoid(ability_u - difficulty_q)        [logits]
 *    err = actual - P ;  ability_u += lr*err ;  difficulty_q -= lr*err
 * lr shrinks as an entity accrues games (mimics Glicko's shrinking uncertainty).
 *
 * Source of truth: public.user_question_history (one row per user×question:
 *   was_correct, time_taken_ms, seen_at). Practice-mode standard conditions.
 *
 * A question graduates to a SHOWN Easy/Medium/Hard band only once CALIBRATED
 * (games >= MIN_GAMES). Band from the Elo-implied facility for a median learner:
 *   facility >= EASY_FACILITY -> Easy | >= HARD_FACILITY -> Medium | else Hard.
 * Below threshold: left UNCALIBRATED (no label), untouched.
 *
 * Writes (calibrated only): cached_questions.difficulty (col) + question_data.difficulty
 *   + difficultySource='empirical-elo' + calibrated=true + difficultyMeta.
 *
 * DORMANT until traffic: with no question past MIN_GAMES it updates 0 rows.
 *
 * SAFETY: DRY default ON (prints plan + writes a backup of every row it would change).
 *   Run (write): DRY_RUN=false node scripts/recompute-difficulty.mjs
 * Tunables: MIN_GAMES(20) EPOCHS(5) BASE_LR(0.4) EASY_FACILITY(0.70) HARD_FACILITY(0.40)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY_RUN = process.env.DRY_RUN !== 'false';
const MIN_GAMES = parseInt(process.env.MIN_GAMES || '20', 10);
const EPOCHS = parseInt(process.env.EPOCHS || '5', 10);
const BASE_LR = parseFloat(process.env.BASE_LR || '0.4');
const EASY_FACILITY = parseFloat(process.env.EASY_FACILITY || '0.70');
const HARD_FACILITY = parseFloat(process.env.HARD_FACILITY || '0.40');

function envFromFile(p) { const o = {}; if (!existsSync(p)) return o; for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; }
const webEnv = envFromFile(join(ROOT, 'apps/web/.env.local'));
const SUPABASE_URL = webEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = webEnv.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function bandFromFacility(f) { return f >= EASY_FACILITY ? 'Easy' : f >= HARD_FACILITY ? 'Medium' : 'Hard'; }

async function fetchAllGames() {
  const games = [];
  let from = 0; const PAGE = 1000;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/user_question_history?select=user_id,question_id,was_correct,time_taken_ms,seen_at&was_correct=not.is.null&order=seen_at.asc`;
    const r = await fetch(url, { headers: { ...H, Range: `${from}-${from + PAGE - 1}` } });
    if (!r.ok) throw new Error(`history fetch ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) break;
    games.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return games;
}
async function fetchQuestion(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?id=eq.${id}&select=id,difficulty,question_data`, { headers: H });
  const j = await r.json(); return Array.isArray(j) && j[0] ? j[0] : null;
}
async function patchQuestion(id, difficulty, question_data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/cached_questions?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ difficulty, question_data }) });
  return r.ok ? { ok: true } : { ok: false, error: `${r.status}: ${(await r.text()).slice(0, 160)}` };
}

(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE creds in apps/web/.env.local'); process.exit(1); }
  console.log(`\nPHASE 2 — Elo/Rasch difficulty recompute  ·  DRY_RUN: ${DRY_RUN}`);
  console.log(`MIN_GAMES ${MIN_GAMES} · EPOCHS ${EPOCHS} · BASE_LR ${BASE_LR} · facility cutoffs E>=${EASY_FACILITY} M>=${HARD_FACILITY}`);

  const games = await fetchAllGames();
  const qGames = new Map(); games.forEach(g => qGames.set(g.question_id, (qGames.get(g.question_id) || 0) + 1));
  const calibratable = [...qGames.values()].filter(n => n >= MIN_GAMES).length;
  console.log(`\nScored attempts: ${games.length}  ·  distinct questions: ${qGames.size}  ·  questions >= ${MIN_GAMES} games: ${calibratable}`);
  if (!games.length) { console.log(`\nNo attempt data yet — nothing to compute. (Activates automatically post-launch.)`); return; }

  // ---- fit 1PL/Rasch by SGD (Elo) ----
  const ability = new Map();   // user_id -> logit
  const diff = new Map();      // question_id -> logit
  const uSeen = new Map(), qSeen = new Map();
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    for (const g of games) {
      const u = g.user_id, q = g.question_id;
      const a = ability.get(u) || 0, d = diff.get(q) || 0;
      const p = sigmoid(a - d);
      const err = (g.was_correct ? 1 : 0) - p;
      const lrU = BASE_LR / (1 + (uSeen.get(u) || 0) / 10);
      const lrQ = BASE_LR / (1 + (qSeen.get(q) || 0) / 10);
      ability.set(u, a + lrU * err);
      diff.set(q, d - lrQ * err);
      uSeen.set(u, (uSeen.get(u) || 0) + 1);
      qSeen.set(q, (qSeen.get(q) || 0) + 1);
    }
  }
  const abilities = [...ability.values()];
  const thetaMedian = abilities.length ? median(abilities) : 0;

  // per-question stats
  const stat = new Map(); // qid -> {games, correct, times[]}
  for (const g of games) { const s = stat.get(g.question_id) || { games: 0, correct: 0, times: [] }; s.games++; if (g.was_correct) s.correct++; if (Number.isFinite(g.time_taken_ms) && g.time_taken_ms > 0) s.times.push(g.time_taken_ms); stat.set(g.question_id, s); }

  const eligible = [...stat.entries()].filter(([, s]) => s.games >= MIN_GAMES);
  if (!eligible.length) { console.log(`\nNo question has reached ${MIN_GAMES} games yet — 0 calibrated. (Expected pre-launch; activates as data accumulates.)`); return; }

  const ISO = new Date().toISOString();
  const plan = [], backup = [];
  for (const [qid, s] of eligible) {
    const d = diff.get(qid) || 0;
    const eloFacility = sigmoid(thetaMedian - d);          // P(median learner correct)
    const rawFacility = s.correct / s.games;
    const band = bandFromFacility(eloFacility);
    const medianSeconds = s.times.length ? Math.round(median(s.times) / 1000) : null;
    const row = await fetchQuestion(qid); if (!row) continue;
    backup.push({ id: qid, difficulty: row.difficulty, difficultySource: row.question_data?.difficultySource || null, calibrated: row.question_data?.calibrated ?? null });
    const question_data = { ...row.question_data, difficulty: band, difficultySource: 'empirical-elo', calibrated: true, difficultyMeta: { eloRating: +d.toFixed(3), eloFacility: +eloFacility.toFixed(3), rawFacility: +rawFacility.toFixed(3), attempts: s.games, medianSeconds, computedAt: ISO } };
    plan.push({ qid, prevBand: row.difficulty, prevSrc: row.question_data?.difficultySource || 'unknown', band, eloFacility, rawFacility, attempts: s.games, medianSeconds, question_data, changed: row.difficulty !== band || row.question_data?.difficultySource !== 'empirical-elo' });
  }

  console.log(`\nCalibrated ${plan.length} questions (median learner ability θ=${thetaMedian.toFixed(2)}):`);
  plan.slice(0, 40).forEach(p => console.log(`  ${p.qid.slice(0, 8)} ${String(p.prevBand).padEnd(6)}->${p.band.padEnd(6)} (${p.prevSrc}->empirical-elo) eloFac ${(p.eloFacility * 100).toFixed(0)}% raw ${(p.rawFacility * 100).toFixed(0)}% n=${p.attempts}${p.medianSeconds ? ` ${p.medianSeconds}s` : ''}`));
  if (plan.length > 40) console.log(`  … and ${plan.length - 40} more`);
  const dist = plan.reduce((m, p) => (m[p.band] = (m[p.band] || 0) + 1, m), {});
  console.log(`\n  Empirical distribution: Easy ${dist.Easy || 0} · Medium ${dist.Medium || 0} · Hard ${dist.Hard || 0}`);

  const ts = ISO.slice(0, 19).replace(/[:T]/g, '-');
  writeFileSync(join(__dirname, `.backup-recompute-difficulty-${ts}.json`), JSON.stringify(backup, null, 2));

  if (!DRY_RUN) {
    let ok = 0, fail = 0;
    for (const p of plan) { const w = await patchQuestion(p.qid, p.band, p.question_data); if (w.ok) ok++; else { fail++; console.log(`  WRITE-FAIL ${p.qid}: ${w.error}`); } await new Promise(r => setTimeout(r, 40)); }
    console.log(`\nWRITTEN: ${ok} calibrated to empirical-elo, ${fail} failed. Backup saved.`);
  } else {
    console.log(`\nDRY — nothing written. Backup of ${backup.length} rows saved. Re-run with DRY_RUN=false to apply.`);
  }
})().catch(e => { console.error('FATAL', String(e).slice(0, 400)); process.exit(1); });
