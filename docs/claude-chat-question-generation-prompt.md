# Claude.ai Question Generation — Master Prompt

**Purpose**: Generate 500+ practice questions per chapter using Claude.ai's chat
interface with the textbook PDF attached. Questions are human-reviewed, then
bulk-uploaded into Drut's `cached_questions` table via the admin import flow.

This is the **MVP question-generation pipeline** — replaces server-side
batched RAG generation. Server-side AI is reserved for on-demand solution
generation (Quick Method + Full Solution) per `docs/learning-framework.md`.

---

## How to use this doc

1. Open Claude.ai (chat.anthropic.com) in a project workspace
2. Upload the textbook PDF for ONE chapter (e.g., BIEAP Maths 1A Chapter 1: Functions)
3. Copy the full **PROMPT TO PASTE** block below into the chat
4. Fill in the bracketed metadata at the top (subject, class, board, chapter)
5. Send. **First Claude enumerates subtopics + proposes a per-subtopic
   question distribution.** Review the list; approve, edit, or push back.
6. After you approve the subtopic plan, Claude generates 50 questions at
   a time and pauses between batches. Each batch report includes
   cumulative subtopic counts vs. target so you can see balance.
7. Spot-check each batch. Continue if good; refine if not.
8. After all batches done, copy the final JSON array.
9. Open Drut admin → Bulk Import → paste JSON → tag the batch → confirm.

---

## PROMPT TO PASTE

```
ROLE: You are an EAPCET (state engineering entrance exam) subject-matter
expert generating exam-style practice questions for Indian Class 11–12
students. The attached textbook is the SOLE source of truth for content.

METADATA (fill before running):
- Subject:    [Mathematics | Physics | Chemistry]
- Class:      [Class 11 | Class 12 | 1st Year | 2nd Year]
- Board:      [BIEAP | TSBIE | NCERT]
- Chapter:    [Full chapter title from textbook, e.g., "Chapter 1: Functions"]
- Target exam(s): [AP EAPCET | TS EAPCET | both]

CONTENT BOUNDARY (critical):
Every question must trace directly to content in the attached textbook:
- Concepts used must be defined in this chapter
- Formulas must appear in this chapter (with the textbook's notation)
- Numerical values may be original but must use the textbook's standard
  units, constants, and conventions
- If a concept isn't in this chapter, do NOT generate a question on it

STEP 1 — SUBTOPIC ENUMERATION (run this FIRST, before any question generation):

Read the attached chapter PDF and identify the major subtopics covered
in the chapter. Output ONLY a numbered list in this format:

  Subtopics for [Chapter title]:
    1. <Subtopic name> — ~<page-range> (<approx pages>)
    2. <Subtopic name> — ~<page-range> (<approx pages>)
    ...
  Proposed distribution (500 questions):
    1. <Subtopic name>: <N> questions
    2. <Subtopic name>: <N> questions
    ...
  Total: 500

Subtopic names should:
- Be concise (2–6 words)
- Match terminology used in the chapter (use the textbook's headings
  where possible)
- Be specific enough to anchor questions ("Equation of a Plane" not
  "Planes"; "Domain of a Rational Function" not "Functions")
- Be mutually exclusive and collectively cover the chapter

Distribution rule:
- Default to roughly uniform: 500 / N_subtopics per subtopic
- Weight by textbook coverage (pages × density) — give a heavier subtopic
  more questions, a lighter one fewer
- Targets must sum to exactly 500

Then STOP and wait for my approval of the subtopic list AND distribution
before generating any questions.

STEP 2 — QUANTITY: Generate 500 questions total, in batches of 50.
Between batches: pause and confirm with me before continuing.

Distribute each batch ACROSS subtopics so the cumulative count tracks
the approved distribution:
- For batch N, allocate questions proportional to remaining targets
- Never let one subtopic dominate >25% of a batch unless all others are
  already at target
- Tag every question with its subtopic (see OUTPUT SCHEMA below)

DIFFICULTY MIX (across all 500):
- 30% Easy   (150 questions) — direct recall, single-step
- 50% Medium (250 questions) — one concept, multi-step application
- 20% Hard   (100 questions) — multi-concept, trap distractors, full
                                exam-style framing

QUESTION FORMAT:
- 4-option MCQ
- Exactly one correct answer
- Distractors must be plausible (test common student mistakes — wrong
  sign, swapped variables, factor-of-2 error, wrong formula choice,
  unit confusion, etc.)
- Numerical answers should test units / sign / calculation order
- Avoid trivia or pure memorization
- Avoid testing the exact same calculation twice (vary numbers AND framing)

OUTPUT SCHEMA (strict JSON array):

[
  {
    "questionText": "Plain text or LaTeX-wrapped math. Use $...$ for inline math, $$...$$ for block.",
    "options": [
      { "text": "Option A — LaTeX-wrapped if math" },
      { "text": "Option B" },
      { "text": "Option C" },
      { "text": "Option D" }
    ],
    "correctOptionIndex": 0,                // 0-based, MUST be 0–3
    "difficulty": "Easy",                   // Easy | Medium | Hard
    "subtopic": "Equation of a Plane",      // EXACT match of one of the enumerated subtopics
    "fsmTag": "kebab-case-pattern-id",      // e.g., "domain-of-rational-function"
    "concepts": ["concept-tag-1", "concept-tag-2"],  // 1–3 lowercase tags
    "sourcePages": [12, 13],                // textbook pages this question pulls from
    "timeTargets": {                        // seconds per exam
      "ap_eapcet": 60,
      "ts_eapcet": 60,
      "jee_main": 120
    },
    "theOptimalPath": {                     // T.A.R. — Trigger → Action → Result
      "exists": true,
      "preconditions": "When you see [pattern signal]...",
      "steps": [
        "**Trigger:** Identify [the pattern signal in the question]",
        "**Action:** Apply [the technique/formula]: ...",
        "**Result:** [The answer or expression]"
      ],
      "sanityCheck": "[How to verify the answer is reasonable]"
    },
    "fullStepByStep": {                     // D.E.E.P. — phases
      "steps": [
        "**DIAGNOSE:** [What kind of problem is this? What concepts does it test?]",
        "**EXTRACT:** [Pull out given values, constraints, target. Translate words → symbols.]",
        "**EXECUTE:** [The full calculation or reasoning, every step shown]",
        "**PROOF:** [Verify the answer makes mathematical/physical sense]"
      ]
    },
    "visualDescription": null               // null unless the question needs a diagram;
                                            // if needed, describe the diagram in plain
                                            // text for a separate diagram-generation pass
  },
  ...
]

NAMING CONVENTIONS:
- subtopic: human-readable, matches one of the enumerated subtopics from
  Step 1 EXACTLY (no abbreviations, no variants). The admin import will
  reject questions whose subtopic doesn't match the approved list.
- fsmTag: lowercase kebab-case, descriptive of the SOLUTION PATTERN not
  the topic. Example: "completing-the-square" not "quadratic-equations".
  Group questions with the same solution shape under the same fsmTag.
- concepts: lowercase, hyphenated, one per concept tested.
  Example: ["function-domain", "rational-expressions"]

T.A.R. RULES (Quick Method / shortcut):
- exists: true ONLY if there's a genuine shortcut beyond standard calculation
- If the only way to solve is brute-force calculation, set exists: false
  and leave steps empty — the student will use D.E.E.P. instead
- "Trigger" should be a recognition pattern (what to see in the question)
- "Action" should be one operation, not a multi-step calculation
- "Result" should be the answer or a directly-usable expression
- Total length: 3 short bullets, ~1 minute of cognitive work

D.E.E.P. RULES (Full Solution / depth):
- Always present, even if T.A.R. exists
- DIAGNOSE: name the problem type explicitly
- EXTRACT: show given/find/constraints as a table or list
- EXECUTE: every algebraic/logical step shown
- PROOF: dimensional check, plausibility, edge case verification

DISTRACTOR DESIGN:
Each wrong option should map to a specific student mistake. Annotate
mentally as you write (you don't have to include the annotation in
output, but use it to design):
- A: correct answer
- B: sign error
- C: formula confusion (uses a related but wrong formula)
- D: arithmetic slip (right method, wrong calculation)

After each batch of 50, respond with:
- "Batch N complete. Total so far: M/500."
- "Cumulative subtopic distribution:"
- "  1. <Subtopic name>: X / Y (target)"
- "  2. <Subtopic name>: X / Y (target)"
- "  ..."
- "Difficulty mix this batch: Easy <a>, Medium <b>, Hard <c>"
- "Continue? (Yes/No)"
- Then wait for my reply before the next batch.

If a subtopic has reached its target and other subtopics are below 50%
of theirs, the next batch must shift focus. Do not over-allocate.

START with Step 1 (subtopic enumeration). Wait for my approval of the
list AND distribution before starting Batch 1. When generating, cover
each subtopic's foundational concepts first (early-chapter material),
build to advanced within that subtopic. Don't front-load Hard.
```

---

## After Claude finishes (workflow)

1. **Spot-check 5 questions per batch** for:
   - Is the answer actually correct?
   - Are distractors plausible (not obviously wrong)?
   - Does the T.A.R. trigger actually identify the pattern?
   - Does the D.E.E.P. show every step?
   - Does the difficulty rating match how hard it really is?
2. **Reject and regenerate** any batch where >2/5 questions fail spot-check
3. **Save the full JSON** locally as `questions-<board>-<class>-<subject>-<chapter>.json`
4. **Open Drut admin → Bulk Import** (coming in next PR)
5. **Tag the batch**:
   - Source label: `claude-chat-YYYY-MM-DD-<board>-<class>-<subject>-ch<N>`
   - Exam profile(s): which exam(s) this batch targets
   - Subject, class, board, chapter (auto-filled from filename or manual)
6. **Validate** — the admin tool runs a schema check + dedup against existing cache
7. **Confirm upload** — questions go into `cached_questions` with source tag

---

## What this prompt deliberately avoids

- **No "make it harder" iteration loops** — difficulty mix is fixed up front
- **No subjective questions** — every answer must be objectively verifiable
- **No questions that require external context** (calculators, websites, other chapters)
- **No questions about specific textbook page layouts, exercises numbers, etc.** —
  questions test concepts, not textbook navigation
- **No questions that depend on prior exam history** — content from the chapter only

---

## When to refine this prompt

After the first batch of 500, review the spot-check failure modes. Common
issues to refine:
- Distractors too obvious → tighten "plausible mistake" guidance
- T.A.R. always "exists: false" → adjust the "genuine shortcut" definition
- D.E.E.P. too terse → add "minimum 4 steps per phase" rule
- fsmTags too granular or too generic → calibrate with examples

Track issues in `forlater.md` or a dedicated `docs/question-generation-learnings.md`.

---

## Where the output lands

After admin upload, questions sit in `public.cached_questions` with:
- `source` = `claude-chat-YYYY-MM-DD-<batch-id>`
- `verification_status` = `'manual-curated'` (new status — to add via migration)
- `exam_profile` = the exam tag(s) chosen at upload
- `topic` = chapter name (matches knowledge_nodes)
- `subject` = explicit subject column (after migration 037 adds it)
- `question_data` = full JSON shape including T.A.R. + D.E.E.P. structures

The practice/sprint cache query (`get_unseen_questions` RPC) treats these
identically to RAG-generated questions for serving, but the source tag
lets you filter / audit / report on curation quality separately.

---

## Related docs

- `docs/learning-framework.md` — T.A.R. and D.E.E.P. methodology definitions
- `docs/practice-mode-architecture-v2.md` — coming next; captures this pivot + the
  surrounding architecture decisions
