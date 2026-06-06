# Drut Learning Framework

**Purpose**: An internal definition of how Drut helps students learn — the two complementary methods every cached question is structured around.

This is the source of truth for what T.A.R. and D.E.E.P. mean, how the AI generates them, what students see, and where they live in the codebase. Update this document when the methodology changes — not after.

---

## Two frameworks, one philosophy

Competitive exam preparation has two recurring failure modes:

- **The plodder** masters every concept but runs out of time on exam day.
- **The pattern-matcher** memorizes shortcuts but can't adapt when a question is framed unfamiliarly.

Drut trains both halves. Every question we cache or generate carries **a fast solve and a deep solve, side by side.** Students who use both develop speed AND understanding.

---

## T.A.R. — Trigger → Action → Result

A 3-step shortcut for problems that match a known solvable pattern.

| Step | What it means |
|------|---------------|
| **Trigger** | The pattern signal — what's in the question that tells you "I've seen this shape before." |
| **Action** | The technique — the specific operation that exploits the pattern. |
| **Result** | The answer — the value or expression the technique produces. |

**When it applies**: Only to problems with a recognizable pattern. The data carries `theOptimalPath.exists: boolean`. When `false`, no T.A.R. shortcut exists for this problem; the student goes straight to D.E.E.P.

**Generation rule**: Gemini is instructed to format `optimal_path.steps` as exactly three strings, each prefixed `**Trigger:** ...`, `**Action:** ...`, `**Result:** ...`. See `apps/web/supabase/functions/generate-batch/index.ts:113` and `generate-question/index.ts:67`.

**What the student sees**: A "Quick Method" tab in the solution view, with each step labeled by its stage.

**Why it works**: Speed is a learnable skill, not a personality trait. Showing students the abstract pattern (Trigger) + technique (Action) + verification (Result) helps them internalize the shape — not just memorize one example.

---

## D.E.E.P. — Diagnose → Extract → Execute → Proof

A 4-phase methodology for working through ANY problem in full understanding.

| Phase | What it means |
|-------|---------------|
| **Diagnose** | What kind of problem is this? What concepts does it test? |
| **Extract** | Pull out the given values, constraints, and target. Translate words into symbols. |
| **Execute** | Do the calculation or reasoning, showing every step. |
| **Proof** | Verify the answer makes physical/logical sense. Sanity check. |

**When it applies**: Every problem. Always available regardless of whether a T.A.R. shortcut exists.

**Generation rule**: Gemini is instructed to produce `full_solution.phases` as an array of `{ label, content }`. The label is enum-enforced to `'DIAGNOSE' | 'EXTRACT' | 'EXECUTE' | 'PROOF'` (see `packages/shared/src/lib/ai/schema.ts:24`). Each cached question should have all four phases.

**What the student sees**: A "Full Solution" tab in the solution view, each phase as an expandable section.

**Why it works**: Some problems don't fit a pattern, but every problem yields to careful diagnosis → extraction → execution → verification. Teaching the discipline of 4-phase thinking transfers across topics, even when specific shortcuts don't.

---

## Why both, not one

A student who only uses T.A.R. becomes a pattern-matcher who fails on novel questions. A student who only uses D.E.E.P. burns the exam clock. The UI offers both as side-by-side tabs; students can choose which to study for any given question.

The eventual goal (not yet wired into the practice loop) is to nudge: attempt T.A.R. when a shortcut exists, fall back to D.E.E.P. when stuck, then verify the WHY of the shortcut by reading D.E.E.P. anyway. Today this is a manual student choice; the loop can be tightened later.

---

## What students see in the UI

| Element | Quick Method (T.A.R.) | Full Solution (D.E.E.P.) |
|---------|------------------------|---------------------------|
| Tab label | "Quick Method" | "Full Solution" |
| Faded attribution (ink-3) | "(Trigger, Action, Result — T.A.R.)" | "(Diagnose, Extract, Execute, Proof — D.E.E.P.)" |
| Step rendering | Up to 3 steps, each with stage label | 4 phases, expandable cards |
| Empty state | "Calculation required. Use the full solution method." | (always populated) |

---

## Where this lives in code

| File | What |
|------|------|
| `apps/web/supabase/functions/generate-batch/index.ts:113` | T.A.R. + D.E.E.P. instruction in the batch generation prompt |
| `apps/web/supabase/functions/generate-question/index.ts:67` | Same instruction for single-question generation |
| `packages/shared/src/lib/ai/schema.ts:16-27` | Zod schemas for both `optimal_path` and `full_solution` |
| `packages/shared/src/types.ts:16-30` | TypeScript types `TheOptimalPath`, `FullStepByStep`, `QuestionData` |
| `apps/web/components/SolutionView.tsx` | UI rendering for both tabs |
| `apps/web/supabase/functions/_shared/types.ts:16-25` | Edge-function-side type for D.E.E.P. enum |

---

## Open questions worth deciding before scale

These are tracked in `forlater.md` as a dedicated session. Brief summary:

1. **Should T.A.R. step labels be structured data or stay embedded as `**Trigger:**` markdown?** Today they're embedded; cleaner separation would require evolving the schema to `[{ stage: 'Trigger', text: ... }]`. Not blocking; revisit when content volume grows.
2. **The schema permits any number of T.A.R. steps, but the methodology assumes exactly three.** Consider enforcing `.length(3)` in the Zod schema if generation is inconsistent.
3. **D.E.E.P. phase ordering is enum-enforced but not order-enforced.** AI may emit them in any order; the UI today renders in input order. Consider sorting on display for consistency.
4. **The "nudge students from T.A.R. → D.E.E.P. on incorrect answer" pedagogy is described above but not yet wired** — the practice loop currently treats both tabs as equal. Worth designing before launch.

---

## Updating this document

When the methodology changes (new phase added, T.A.R. expanded, framework dropped, names changed), update this file **before** shipping the code change. The doc is the source of truth; the code follows.
