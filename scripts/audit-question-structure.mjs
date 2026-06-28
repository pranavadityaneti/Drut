#!/usr/bin/env node
/**
 * DB-wide STRUCTURAL audit of cached_questions: are questions tagged properly with
 * exam_profile, subject, class_level, topic (chapter), difficulty? Broken down by
 * verification_status (so we can see the v3-verified-rag bulk vs real PYQs).
 * Read-only (service role, count-only requests). Run: node scripts/audit-question-structure.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}` };

async function count(filter = '') {
  const r = await fetch(`${SUPA}/rest/v1/cached_questions?select=id${filter}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  return parseInt((r.headers.get('content-range') || '0-0/0').split('/')[1] || '0', 10) || 0;
}
async function distinct(col) {
  const out = {}; let from = 0;
  for (;;) {
    const r = await fetch(`${SUPA}/rest/v1/cached_questions?select=${col}`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const rows = await r.json(); if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach(x => { const k = x[col] === null || x[col] === undefined || x[col] === '' ? '(null)' : x[col]; out[k] = (out[k] || 0) + 1; });
    if (rows.length < 1000) break; from += 1000;
  }
  return out;
}

const STATUSES = ['v3-verified-rag', 'v3-verified-pyq', 'v3-unverified-ai', null];
const FIELDS = ['exam_profile', 'subject', 'topic', 'difficulty', 'class_level'];

(async () => {
  const total = await count('');
  console.log(`\n=== STRUCTURAL audit (${total} questions) ===`);

  // missing-field counts overall + per key status
  console.log(`\nMISSING (null/empty) field counts:`);
  console.log(`  scope            ` + FIELDS.map(f => f.padStart(13)).join(''));
  for (const st of ['ALL', ...STATUSES]) {
    const base = st === 'ALL' ? '' : st === null ? '&verification_status=is.null' : `&verification_status=eq.${st}`;
    const tot = await count(base);
    const cells = [];
    for (const f of FIELDS) {
      const miss = await count(`${base}&${f}=is.null`);
      cells.push(`${miss}`.padStart(13));
    }
    console.log(`  ${String(st === null ? '(null-status)' : st).padEnd(17)}(${tot})`.padEnd(28) + cells.join(''));
  }

  // distinct exam_profile + subject + difficulty
  console.log(`\nDISTINCT exam_profile:`);
  Object.entries(await distinct('exam_profile')).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(`  ${String(c).padStart(5)}  ${k}`));
  console.log(`\nDISTINCT subject:`);
  Object.entries(await distinct('subject')).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(`  ${String(c).padStart(5)}  ${k}`));
  console.log(`\nDISTINCT difficulty:`);
  Object.entries(await distinct('difficulty')).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(`  ${String(c).padStart(5)}  ${k}`));

  // topic format quality (Chapter N: ... vs bare) among the v3-verified-rag bulk
  const ragBase = '&verification_status=eq.v3-verified-rag';
  const ragTotal = await count(ragBase);
  const ragChapterFmt = await count(`${ragBase}&topic=like.Chapter %`);
  console.log(`\nTOPIC format (v3-verified-rag, ${ragTotal}):`);
  console.log(`  "Chapter N: ..." style: ${ragChapterFmt}  ·  other/bare: ${ragTotal - ragChapterFmt}`);
  console.log(`\n(class_level was only added 2026-06-20, so legacy rows are null there by design — class is derivable from topic via examSyllabusConfig.)`);
})().catch(e => console.log('ERR', String(e).slice(0, 300)));
