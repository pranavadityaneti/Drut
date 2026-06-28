#!/usr/bin/env node
/**
 * List the canonical (exam_profile · subject · topic) combos that actually exist
 * in cached_questions, with counts and trusted/served breakdown. Use this to pick
 * the EXACT topic string for generate-chapter.mjs (serving matches topic exactly,
 * e.g. 'Chapter 5: Laws of Motion', not bare 'Laws of Motion').
 *
 * Also prints the verification_status distribution (to locate PYQ/seeded rows).
 *
 * Usage:
 *   node scripts/list-chapters.mjs                         # all
 *   node scripts/list-chapters.mjs ap_eapcet Physics       # filter exam + subject
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = (() => { const o = {}; for (const l of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SK, Authorization: `Bearer ${SK}` };

const [, , examFilter, subjectFilter] = process.argv;
const TRUSTED = ['v3-verified-pyq', 'v3-verified-textbook', 'v3-verified-rag', '2.6', 'SubjectFallback', 'ai-openai-audited'];
const isTrusted = (vs) => !!vs && TRUSTED.some(t => String(vs).includes(t));

async function pageAll(path) {
  const out = []; let from = 0; const size = 1000;
  for (;;) {
    const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { ...H, Range: `${from}-${from + size - 1}` } });
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) break;
    out.push(...rows); if (rows.length < size) break; from += size;
  }
  return out;
}

(async () => {
  let q = 'cached_questions?select=exam_profile,subject,topic,verification_status';
  if (examFilter) q += `&exam_profile=eq.${examFilter}`;
  if (subjectFilter) q += `&subject=eq.${subjectFilter}`;
  const rows = await pageAll(q);
  console.log(`Total rows: ${rows.length}` + (examFilter ? ` (exam=${examFilter}${subjectFilter ? ', subject=' + subjectFilter : ''})` : ''));

  // verification_status distribution
  const vs = {};
  rows.forEach(r => { const k = r.verification_status || '(null)'; vs[k] = (vs[k] || 0) + 1; });
  console.log('\nverification_status distribution:');
  Object.entries(vs).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(`  ${String(c).padStart(5)}  ${k}${isTrusted(k) ? '  [trusted/served]' : ''}`));

  // canonical topics
  const combo = {};
  rows.forEach(r => {
    const k = `${r.exam_profile} · ${r.subject || '(no subject)'} · ${r.topic}`;
    combo[k] = combo[k] || { total: 0, trusted: 0 };
    combo[k].total++; if (isTrusted(r.verification_status)) combo[k].trusted++;
  });
  console.log(`\nCanonical (exam · subject · topic) — ${Object.keys(combo).length} combos [total / served]:`);
  Object.entries(combo).sort((a, b) => b[1].total - a[1].total).forEach(([k, v]) => console.log(`  ${String(v.total).padStart(4)} / ${String(v.trusted).padStart(4)}  ${k}`));
})().catch(e => console.log('ERR', String(e).slice(0, 200)));
