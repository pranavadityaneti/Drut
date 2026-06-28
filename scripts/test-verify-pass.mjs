#!/usr/bin/env node
/**
 * Adversarial test of the LLM-verify gate in generate-chapter.mjs.
 *
 * Runs the REAL verify gate (verifyAnswer + verifyVerdict, imported — not a copy)
 * against the 9 already-generated pilot questions in generate-chapter-output.json.
 * The pilot's prior human audit found exactly ONE defective question (an arithmetic
 * slip whose keyed answer is wrong / not even an option). A working gate must HOLD
 * that one and PASS the rest.
 *
 * This makes NO new generation calls — it only re-verifies saved questions, so it's
 * cheap and deterministic-ish (one verify call per question).
 *
 * Run: node scripts/test-verify-pass.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { verifyAnswer, verifyVerdict } from './generate-chapter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const L = ['A', 'B', 'C', 'D'];

const out = JSON.parse(readFileSync(join(__dirname, 'generate-chapter-output.json'), 'utf8'));
const items = (out.results || []).filter(r => r && r.json && r.json.questionText);

console.log(`\nLLM-verify gate test — re-verifying ${items.length} pilot questions (no context, self-contained numerics)\n`);

let held = 0, passed = 0;
const heldList = [];
for (let i = 0; i < items.length; i++) {
  const q = items[i].json;
  const v = await verifyAnswer(q, '');
  const verdict = verifyVerdict(q, v);
  const keyed = L[q.correctOptionIndex];
  const got = v.json && Number.isInteger(v.json.answerIndex) ? (v.json.answerIndex === -1 ? 'none' : L[v.json.answerIndex]) : '?';
  const tag = verdict.ok ? 'PASS' : 'HOLD';
  if (verdict.ok) passed++; else { held++; heldList.push(i); }
  console.log(`  [${i}] ${items[i].difficulty.padEnd(6)} keyed=${keyed}  verifier=${String(got).padEnd(4)}  conf=${(v.json?.confidence || '-').padEnd(6)}  => ${tag}` +
    (verdict.ok ? '' : `  [${verdict.reason}${verdict.detail ? ': ' + verdict.detail : ''}]`));
  if (!verdict.ok && v.json?.answerValue) console.log(`        verifier computed: ${String(v.json.answerValue).slice(0, 120)}`);
  await new Promise(r => setTimeout(r, 600));
}

console.log(`\nResult: ${passed} PASS · ${held} HELD  (held indices: [${heldList.join(', ')}])`);
console.log(held >= 1
  ? `\n✓ Gate is live — it held ${held} question(s). Cross-check the held index/indices against the pilot's known defect.`
  : `\n⚠️  Gate held NOTHING. Either the defect self-resolved on this verify run, or the gate is too lenient — inspect.`);
