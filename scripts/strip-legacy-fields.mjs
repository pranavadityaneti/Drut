#!/usr/bin/env node
/**
 * Strip stale OLD-format solution fields from NEW-format questions.
 *
 * The enriched PYQs carry BOTH the new "B+C mix" format (quickMethod + fullSolution)
 * AND leftover legacy fields (theOptimalPath / fullStepByStep). All renderers already
 * prefer the new format, so the old fields are dead weight — removing them guarantees
 * no old-format ("Optimal Path / Trigger" label) can ever leak from a missed/future
 * render path.
 *
 * SAFETY
 *  - DRY_RUN defaults ON: reports + writes a local backup, but does NOT touch the DB.
 *  - BACKUP: every affected row's FULL before-state is written to a local JSON first,
 *    so the change is fully reversible (re-PATCH question_data from the backup).
 *  - GUARD: only strips rows that HAVE the new format (quickMethod.steps + fullSolution).
 *    A row without new format is NEVER touched — we never remove the only solution it has.
 *
 * Run (dry):   node scripts/strip-legacy-fields.mjs
 * Run (write): DRY_RUN=false node scripts/strip-legacy-fields.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };
const DRY_RUN = process.env.DRY_RUN !== 'false';
const STRIP_FIELDS = ['theOptimalPath', 'fullStepByStep', 'fastestSafeMethod', 'full_solution', 'optimal_path'];

function hasNewFormat(qd) {
  return !!(qd && qd.quickMethod && Array.isArray(qd.quickMethod.steps) && qd.quickMethod.steps.length > 0 && qd.fullSolution);
}

async function fetchTargets() {
  const oldNotNull = STRIP_FIELDS.map(f => `question_data->${f}.not.is.null`).join(',');
  const url = `${SUPA}/rest/v1/cached_questions?select=id,question_id,verification_status,question_data`
    + `&question_data->quickMethod=not.is.null&question_data->fullSolution=not.is.null`
    + `&or=(${oldNotNull})&limit=2000`;
  const r = await fetch(url, { headers: H });
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error('fetch failed: ' + JSON.stringify(rows).slice(0, 200));
  return rows;
}

async function patchRow(id, cleaned) {
  const r = await fetch(`${SUPA}/rest/v1/cached_questions?id=eq.${id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ question_data: cleaned }),
  });
  if (!r.ok) return { ok: false, error: `${r.status}: ${(await r.text()).slice(0, 160)}` };
  return { ok: true };
}

(async () => {
  if (!SUPA || !SK) { console.error('Missing Supabase creds (apps/web/.env.local)'); process.exit(1); }
  console.log(`\nStrip legacy fields — DRY_RUN: ${DRY_RUN}`);
  console.log(`Fields to remove (if present): ${STRIP_FIELDS.join(', ')}`);

  const rows = await fetchTargets();
  console.log(`Target rows (new-format AND carrying ≥1 old field): ${rows.length}\n`);
  if (rows.length === 0) { console.log('Nothing to do.'); return; }

  // BACKUP before any change (full before-state — restorable).
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const backupPath = join(ROOT, 'scripts', `.backup-strip-legacy-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(rows, null, 2));
  console.log(`Backup written: ${backupPath}\n  (${rows.length} rows, full question_data — restore by re-PATCHing from this file)\n`);

  let stripped = 0, skipped = 0, failed = 0; const fieldCounts = {};
  for (const row of rows) {
    const qd = row.question_data || {};
    if (!hasNewFormat(qd)) { skipped++; console.log(`  SKIP ${row.id} — guard: no new format`); continue; }
    const cleaned = { ...qd };
    const removed = [];
    for (const f of STRIP_FIELDS) { if (cleaned[f] !== undefined) { delete cleaned[f]; removed.push(f); fieldCounts[f] = (fieldCounts[f] || 0) + 1; } }
    if (removed.length === 0) { skipped++; continue; }
    if (DRY_RUN) {
      stripped++;
      if (stripped <= 3) console.log(`  [dry] ${row.id} (${row.verification_status}) remove: [${removed.join(', ')}]\n         kept: [${Object.keys(cleaned).join(', ')}]`);
    } else {
      const w = await patchRow(row.id, cleaned);
      if (w.ok) stripped++; else { failed++; console.log(`  WRITE-FAIL ${row.id}: ${w.error}`); }
      await new Promise(r => setTimeout(r, 60));
    }
  }

  console.log(`\nDone. ${DRY_RUN ? '(DRY — nothing written)' : 'WRITTEN'} — stripped ${stripped}, skipped ${skipped}, failed ${failed}`);
  console.log(`Field removal counts: ${JSON.stringify(fieldCounts)}`);
  console.log(DRY_RUN
    ? `\nReview the sample + backup above, then re-run with: DRY_RUN=false node scripts/strip-legacy-fields.mjs`
    : `\nRestore (if ever needed): re-PATCH question_data for each id from ${backupPath}`);
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
