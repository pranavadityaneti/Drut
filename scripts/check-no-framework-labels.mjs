#!/usr/bin/env node
/**
 * Build guard — internal solution-scaffolding labels must NEVER be rendered to users.
 *
 * The question-generation backend uses scaffolding names (T.A.R., D.E.E.P., FSM /
 * "Fastest Safe Method", "Optimal Path", "Pattern Trigger") that are a LOCKED rule:
 * they must never appear in the app UI. This scans the student-facing solution /
 * practice / sprint render surfaces and FAILS if any banned token appears on a
 * non-comment line.
 *
 * Out of scope (intentional, not student-facing): landing/marketing copy
 * (HeroSection, WaitlistClassic, SolutionSection) and admin tools (BulkIngest,
 * AdminIngestion). Add new render surfaces to FILES as they are created.
 *
 * Run: node scripts/check-no-framework-labels.mjs   (or: npm run check:labels)
 */

import fs from 'node:fs';

const FILES = [
  'apps/web/components/SolutionView.tsx',
  'apps/web/components/practice/InterventionModal.tsx',
  'apps/web/components/practice/FsmPanel.tsx',
  'apps/web/components/practice/FeedbackSummary.tsx',
  'apps/mobile/components/practice/InterventionModal.tsx',
];

// ™ = ™ ; \bFSM\b matches the standalone acronym but NOT code like `fsmTag`.
const BANNED = /T\.A\.R|D\.E\.E\.P|Framework™|Fastest Safe Method|Optimal Path|Pattern Trigger|\bFSM\b/;

const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*');
};

const violations = [];
for (const f of FILES) {
  let src;
  try {
    src = fs.readFileSync(f, 'utf8');
  } catch {
    console.warn(`(skipped missing file: ${f})`);
    continue;
  }
  src.split('\n').forEach((line, i) => {
    if (isCommentLine(line)) return;
    if (BANNED.test(line)) violations.push(`${f}:${i + 1}:  ${line.trim()}`);
  });
}

if (violations.length) {
  console.error('✖ Framework-label guard FAILED — internal scaffolding names must not reach the UI:');
  for (const v of violations) console.error('  ' + v);
  console.error('\nUse plain names ("Quick Method" / "Full Solution"). Intentional brand/admin copy does not belong in a student-facing render file.');
  process.exit(1);
}

console.log(`✓ Framework-label guard passed (${FILES.length} render surfaces clean).`);
