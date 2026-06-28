// Validate a Claude.ai-generated bulk-import JSON file against the
// strict BulkImportPayloadSchema from @drut/shared.
//
// USAGE:
//   npx tsx scripts/validate-bulk-import.mjs <path-to-json>
//
// EXAMPLES:
//   npx tsx scripts/validate-bulk-import.mjs \
//     "docs/Questions from textbooks/AP EAPCET/Inter 1st Year/Physics/physics-i-ch01-physical-world.json"
//
// EXIT CODES:
//   0 — valid (file passes strict schema)
//   1 — invalid (schema errors; report printed)
//   2 — usage error (missing/unreadable file, bad JSON)
//
// WHY THIS EXISTS:
// Run this BEFORE uploading any Claude.ai batch via the admin Bulk Import
// UI. The UI runs the same Zod schema, so a file that fails this script
// will also fail the UI. Catching it here avoids the round-trip and gives
// you grouped, copy-pasteable error output to send back to Claude chat.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BulkImportPayloadSchema } from '../packages/shared/src/lib/questionSchema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.argv[2];
if (!target) {
  console.error('Usage: npx tsx scripts/validate-bulk-import.mjs <path-to-json>');
  process.exit(2);
}

const absPath = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);

let raw;
try {
  raw = fs.readFileSync(absPath, 'utf8');
} catch (e) {
  console.error(`ERROR — could not read file: ${absPath}`);
  console.error(`  ${e.message}`);
  process.exit(2);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`ERROR — invalid JSON: ${absPath}`);
  console.error(`  ${e.message}`);
  process.exit(2);
}

console.log(`Validating: ${path.relative(process.cwd(), absPath)}`);
console.log('');

const result = BulkImportPayloadSchema.safeParse(data);

if (result.success) {
  console.log(`✓ VALID — ${result.data.length} questions pass strict schema`);

  // Quick distribution report for verification.
  const diff = {};
  const subs = {};
  const opt = [0, 0, 0, 0];
  let tarTrue = 0;
  let tarFalse = 0;
  const visTypes = {};

  for (const q of result.data) {
    diff[q.difficulty] = (diff[q.difficulty] || 0) + 1;
    subs[q.subtopic] = (subs[q.subtopic] || 0) + 1;
    opt[q.correctOptionIndex]++;
    if (q.theOptimalPath.exists) tarTrue++;
    else tarFalse++;
    visTypes[q.visual.type] = (visTypes[q.visual.type] || 0) + 1;
  }

  console.log('');
  console.log('Difficulty:', diff);
  console.log('correctOptionIndex spread (pos 0/1/2/3):', opt.join(' / '));
  console.log(`theOptimalPath: exists=${tarTrue}, !exists=${tarFalse}`);
  console.log('visual types:', visTypes);
  console.log('');
  console.log('Subtopics:');
  Object.entries(subs).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));

  process.exit(0);
}

// Invalid — print grouped error report.
console.log(`✗ INVALID — ${result.error.issues.length} schema issue(s)`);
console.log('');

const byPath = {};
for (const issue of result.error.issues) {
  const key = issue.path.slice(1).join('.') || '<root>';
  byPath[key] = (byPath[key] || 0) + 1;
}

console.log('Issue breakdown by path (sorted by count):');
Object.entries(byPath)
  .sort((a, b) => b[1] - a[1])
  .forEach(([p, c]) => {
    console.log(`  ${String(c).padStart(3)}x  ${p}`);
  });

console.log('');
console.log('First 10 sample issues:');
result.error.issues.slice(0, 10).forEach((i) => {
  const row = typeof i.path[0] === 'number' ? `Row ${i.path[0] + 1}` : '<root>';
  const subPath = i.path.slice(1).join('.') || '<root>';
  console.log(`  ${row} (${subPath}): ${i.message}`);
});

if (result.error.issues.length > 10) {
  console.log(`  … and ${result.error.issues.length - 10} more`);
}

console.log('');
console.log('Fix in Claude.ai and re-export the batch.');
process.exit(1);
