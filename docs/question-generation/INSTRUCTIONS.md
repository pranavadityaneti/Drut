# Question Generation — Canonical Spec

This is the locked generator specification for Drut's curated question bank.
Claude Code reads this file before generating ANY batch. It encodes the schema
contract plus every quality lesson learned in Chapters 1–2 (June 2026). When a
new lesson lands, it gets added HERE — this file is the institutional memory.

Workflow summary: per chapter → read textbook PDF → enumerate subtopics →
write `chapters/chNN-*.md` config → generate batches of 50 → validate each
batch with `scripts/validate-bulk-import.mjs` → adversarially audit the Hard
questions (parallel Workflow agents) → apply fixes → save → log → commit.
Pranav uploads finished files via admin Bulk Import (his JWT; Claude cannot).

---

## 1. Ground truth — non-negotiable

- Every question traces to the chapter PDF in `textbooks/` (gitignored;
  re-download with `bash scripts/download-textbooks.sh`).
- NEVER generate from memory. No PDF → no generation; queue in forlater.md.
- Concepts, formulas, notation, constants: the textbook's versions only.
  If the textbook uses g = 10 m/s² in an example, a question may too — but
  ALWAYS state the g value explicitly in the question text.
- `sourcePages` = TEXTBOOK page numbers (printed on page), not PDF pages.
  For Physics-I (BIEAP 1st Year): PDF page = textbook page + 16.
- Numerical answers in BIEAP exercise sections (printed [Ans: …]) are
  verified targets — adapting their structure with fresh numbers is GOOD
  (canonical exam framings, per the Chapter 2 decision). Copying their exact
  numbers is NOT.

## 2. Schema contract (sync: packages/shared/src/lib/questionSchema.ts)

Strict JSON array. Every question:

| Field | Rule |
|---|---|
| questionText | non-empty; LaTeX `$...$` inline, `$$...$$` block; ASCII spaces ONLY (no NBSP — breaks Postgres hash dedup) |
| options | exactly 4 × `{ "text": "..." }` |
| correctOptionIndex | int 0–3, assigned DELIBERATELY at write time (§4) |
| difficulty | `Easy` / `Medium` / `Hard` |
| subtopic | EXACT string from the chapter config's enumeration |
| fsmTag | lowercase kebab-case, names the SOLUTION PATTERN not the topic |
| concepts | 1–3 kebab-case tags. **HARD CAP 3** — pick the most central |
| sourcePages | array of positive ints (textbook pages) |
| timeTargets | `{ap_eapcet, ts_eapcet, jee_main}` positive ints, seconds |
| theOptimalPath | T.A.R. — see §3 |
| fullStepByStep | D.E.E.P. — see §3 |
| visual | `{ "type": "none" }` for closed beta (§5). Field name is `visual` — **`visualDescription` is FORBIDDEN** (deprecated; strict schema rejects unknown keys) |

Validate every batch: `npx -y tsx scripts/validate-bulk-import.mjs "<file>"`.
Exit 0 required before a batch counts as done.

## 3. T.A.R. and D.E.E.P. quality bars

**T.A.R.** (`theOptimalPath`) — Trigger → Action → Result:
- `exists: true` ONLY for a genuine recognition shortcut: pattern signal +
  ONE operation + answer, ~60s of cognitive work.
- **Ch2-Q20 lesson:** if the T.A.R. walks the same pipeline as the D.E.E.P.,
  it is a relabeled derivation, not a shortcut → set `exists: false`,
  `steps: []`. Recall questions and full-calculation questions get
  `exists: false`. Honesty over coverage.
- **Ch3-B1 lesson (under-claiming):** before settling on `exists: false`,
  actively hunt for a shortcut — the audit found real ones I missed:
  statement-combos where one statement claims universality (refute it →
  eliminate every option containing it); throw-from-height (landing speed
  via $v^2$ then $t = (v_0+v)/g$, no quadratic). Both directions of
  T.A.R. dishonesty — fake shortcuts AND missed shortcuts — get flagged.

**D.E.E.P.** (`fullStepByStep`) — 4 phases, all substantive:
- DIAGNOSE: name the problem type; cite the textbook section if useful.
- EXTRACT: given / find / constraints.
- EXECUTE: every step shown.
- PROOF: verify the answer AND derive each distractor's origin.
- **Ch2-Q23 lesson:** when PROOF claims "option B comes from mistake X",
  ARITHMETICALLY CHECK that mistake X actually produces option B's value.
  A wrong attribution misleads every student who reads it.
- **Ch2-Q49 lesson:** PROOF must address ALL THREE wrong options, no gaps,
  no mid-sentence self-corrections left in the text.
- **Ch3 recurring lesson (scratch-text leak):** the generator repeatedly
  leaks drafting fragments into PROOFs ("... no - it computes...",
  "$\ldots$ no -", "doubles... no"). MANDATORY post-generation scrub on
  every batch file BEFORE validation:
  `grep -o '\.\.\. no \|no - it\|? no -\|ldots no' <file>` must return
  empty. If an attribution isn't certain while drafting, STOP and verify
  the arithmetic instead of thinking aloud into the string.

## 4. Distractor + answer-position discipline

- Each wrong option maps to ONE specific, derivable student mistake
  (sign error, missing factor, wrong formula, dropped term, unit slip,
  swapped quantities, arithmetic-order error).
- **Ch2-Q24 lesson:** a distractor with no derivable mistake path is filler
  — replace it before shipping. Write the mistake-map mentally per question.
- **Ch3-B2-Q44 lesson (option equivalence):** check that no two options are
  MATHEMATICALLY EQUIVALENT under rewriting — $1:(\sqrt2-1)$ and
  $(\sqrt2+1):1$ are the SAME ratio rationalised. Surd ratios, equivalent
  fractions, and reciprocal pairs are the danger zone. Two correct options
  is a fatal, student-facing defect.
- **Ch3-B2-Q50 lesson (wrong-method coincidence):** check that no plausible
  WRONG method lands on the CORRECT option value (e.g., total distance ÷
  ground speed accidentally equalling the right answer). If it does, change
  the numbers — a question that rewards bad reasoning trains bad reasoning.
- `correctOptionIndex`: assign deliberately DURING generation, tracking a
  running tally; target 12–13 per position per 50-question batch. Claude
  chat drifted to position bias twice when leaving this to chance.
- After writing a batch, audit that every "option X" reference inside
  T.A.R./D.E.E.P. text matches the actual `correctOptionIndex`.

## 5. Visuals — closed-beta rule

- The admin-bulk-import edge function REJECTS `svg` for closed beta (render
  sanitizer not shipped — forlater #47). Everything in a main batch file
  must be `{ "type": "none" }` so the file uploads TODAY.
- Graph questions: describe the figure precisely in words ("the x-t graph is
  a straight line inclined to the time axis", "the v-t graph is a rectangle
  of height u between t = 0 and t = T"). This covers most kinematics
  graph-reading skills.
- A question that is IMPOSSIBLE without seeing a figure: skip it, note it in
  the chapter config under "Deferred svg questions" for a post-renderer pass.
- `smiles` is allowed (organic chemistry only) — RDKit-renderable, ≤500 chars.

## 6. Difficulty + distribution

- Default mix 30% Easy / 50% Medium / 20% Hard (per batch: 15/25/10).
  Override per chapter ONLY with a written rationale in the chapter config
  (Ch1 used 60/30/10 because pure-recall chapters have no Medium).
- **Ch3-B1 lesson (Hard calibration):** bias Hard slots toward multi-step
  NUMERICALS (snapshot problems, two-body, inherited-velocity, composite
  scaling) over find-the-false-statement combos — auditors rated several
  statement-combo "Hards" as playing Medium. Statement traps are fine as
  Medium; a Hard should need 2+ chained quantitative insights.
- Subtopic targets from the chapter config; per batch, allocate proportional
  to remaining targets; cumulative tally reported after each batch.
- No repeated calculation or framing across batches within a chapter —
  maintain a ledger of used functional forms / scenarios in the config.

## 7. timeTargets guidance

- Easy: 30–45s | Medium: 45–75s | Hard: 75–120s (ap/ts_eapcet equal).
- jee_main ≈ 1.5× the EAPCET figure.
- Numerical multi-step questions sit at the top of their band.

## 8. Per-batch pipeline (all steps required)

1. Generate 50 questions (deliberate position assignment, ledger updated).
2. `npx -y tsx scripts/validate-bulk-import.mjs "<file>"` → exit 0.
3. Adversarial audit: parallel Workflow agents on ALL Hard questions
   (independent re-derivation; distractor mistake-paths; T.A.R. genuine vs
   relabeled; PROOF completeness; content boundary). Apply every accept-note
   fix. A math-wrong question is regenerated, not patched.
4. Save to `docs/Questions from textbooks/<exam>/<class>/<subject>/`
   as `<subject>-<book>-chNN-<slug>-batchN.json`.
5. Update the chapter config ledger + SESSION_LOG.md.

## 9. Upload handoff (Pranav)

- Files stack up ready-to-upload; Pranav tags + uploads via admin Bulk
  Import. Recommended batch tags live in each chapter config.
- verification_status is forced server-side ('admin-verified'); dedup is
  hash-based (re-uploading a file shows N duplicates, 0 inserted — harmless).
