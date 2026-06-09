# Practice Mode Architecture v2

**Purpose**: Capture the decisions that came out of the 2026-06-07 session — the
pivot from server-side RAG generation to Claude.ai-driven bulk curation, plus
the data-model changes that follow.

**Scope**: This doc focuses on what's CHANGING for the next 2–3 PRs (admin
import flow, subject column, source taxonomy). Broader architecture frame (full
syllabus equivalence, concept tags, cross-board augmentation) is deferred to a
v3 doc when those become real.

---

## The pivot (one paragraph)

Server-side batched RAG generation is being retired for MVP. Questions will be
generated **out-of-band** in Claude.ai chat with the chapter PDF attached
(prompt in `docs/claude-chat-question-generation-prompt.md`), human-reviewed in
batches, then bulk-uploaded via a new admin import screen. Server-side AI
shrinks to a small role — **only** on-demand solution generation (Quick Method /
Full Solution rendering per `docs/learning-framework.md`). Cache-warm script is
retired; `ALLOW_LIVE_AI_FALLBACK` stays `false`.

**Why**: question quality is the bottleneck for MVP, not throughput. Claude.ai
with the real textbook attached + iterative human review produces better
questions than blind batched RAG. Cost shifts from per-question runtime to
one-time curation. Hallucination contained to a small reviewed surface.

---

## What's changing in the data model

### 1. `cached_questions.subject` — new column (migration 037)

Subject is currently **implicit** — derived from chapter name via a
knowledge_nodes parent walk. This is fragile because chapter names can collide
across subjects (e.g., "Vectors" appears in both Maths and Physics under
different parents). Making subject explicit lets queries filter by subject
directly and lets the admin upload set subject at batch time.

```sql
-- Migration 037 sketch
ALTER TABLE public.cached_questions ADD COLUMN subject text;

-- Backfill from knowledge_nodes parent walk (one-time)
UPDATE public.cached_questions cq
SET subject = (
  SELECT s.name
  FROM public.knowledge_nodes t
  JOIN public.knowledge_nodes s ON s.id = t.parent_id
  WHERE t.name = cq.topic AND t.node_type = 'topic' AND s.node_type = 'subject'
  LIMIT 1
);

-- After backfill confirmed:
ALTER TABLE public.cached_questions ALTER COLUMN subject SET NOT NULL;
```

Future inserts (admin upload, edge functions, any new code path) **must** set
`subject` explicitly. The implicit derivation goes away.

### 2. New `verification_status` value: `manual-curated`

Today's verification_status values:
- `v3-verified-pyq` — Previous Year Question (real exam paper)
- `v3-verified-textbook` — older textbook-verified curation
- `v3-verified-rag` — RAG-grounded AI generation
- `v3-unverified-ai` — ungrounded AI fallback
- `2.6`, `SubjectFallback` — legacy

**Add**: `manual-curated` — human-reviewed Claude.ai-generated questions
uploaded via admin import. Trust level: between PYQ (highest) and RAG
(medium). Mobile's trust filter treats it as trusted (no client-side keyword
validation needed).

### 3. New `source` tag format for Claude.ai batches

Existing source tags: `pyq`, `manual`, `rag-warm-2026-06-06`, etc.

**Adding**: `claude-chat-<YYYY-MM-DD>-<board>-<class>-<subject>-ch<N>` — one
tag per chapter batch. Examples:
- `claude-chat-2026-06-08-BIEAP-1stYear-Maths-ch1`
- `claude-chat-2026-06-08-NCERT-Class11-Physics-ch3`

Granularity is one batch per (board × class × subject × chapter), so we can
audit / report / regenerate per chapter without affecting others.

---

## What's changing in the cache query path

### Filter by `subject` explicitly

`get_unseen_questions` RPC and `getQuestionsForUser` in
`packages/shared/src/services/questionCacheService.ts` currently filter by
`(exam_profile, topic, subtopic, difficulty)`. After migration 037, add
`subject` to the filter. Closes the "Vectors chapter in Maths vs Physics"
ambiguity.

### Source priority (when serving)

When a chapter has questions from multiple sources, the cache RPC should
prefer in this order (highest trust first):
1. `v3-verified-pyq`
2. `manual-curated` (Claude.ai)
3. `manual`
4. `v3-verified-textbook`
5. `v3-verified-rag`
6. `v3-unverified-ai`

Implementation: ORDER BY a CASE expression in the RPC's SELECT. Existing
rotation/freshness logic stays.

---

## Admin Bulk Import — UI shape (next PR)

New screen: `Admin → Bulk Import Questions`

```
[ Drop JSON file here or click to upload ]
   ↓ (file parsed, schema validated)
[ Preview table: 500 questions, first 10 shown ]
   - questionText (truncated)
   - difficulty
   - fsmTag
   - validation status (✓ / ⚠ / ✗)
   ↓
[ Batch tagging — required ]
   - Source label:          claude-chat-2026-06-08-BIEAP-1stYear-Maths-ch1
                            (pre-filled from file name if possible)
   - Exam profile(s):       ☑ ap_eapcet  ☑ ts_eapcet  ☐ jee_main
   - Subject:               [Mathematics ▼]
   - Class:                 [Class 11 ▼]
   - Board:                 [BIEAP ▼]
   - Verification status:   manual-curated (forced for this flow)
   ↓
[ Validation pass ]
   - Schema check: all questions match the strict schema
   - Duplicate detection: questionText hash vs existing cache
   - Required fields: questionText, options[4], correctOptionIndex, T.A.R.,
     D.E.E.P., fsmTag, concepts[], difficulty
   - Output: "487 ready, 13 duplicates (skipped), 0 errors"
   ↓
[ Confirm upload ]
   - Inserts into cached_questions
   - Row per (question × exam_profile) — so 487 questions × 2 exams = 974 rows
   - All rows tagged with the same source label + manual-curated status
```

Validation rules (admin import side):
- Every question must have all required fields
- correctOptionIndex must be 0–3
- options array must have exactly 4 items
- Each option.text must be non-empty
- fsmTag must match `^[a-z0-9]+(-[a-z0-9]+)*$`
- T.A.R. and D.E.E.P. structures must be present (even if T.A.R. has exists: false)

Reject the entire batch if any question fails schema validation (don't
partial-import). Let the curator regenerate the bad ones in Claude.ai.

---

## What's deliberately NOT in this doc

These are real questions that need answers, but their answers don't gate the
admin upload flow:

### Concept tags for cross-board augmentation
The Claude.ai prompt asks for `concepts[]` per question. Long-term we'll use
these to enable "give me questions on `function-domain` regardless of which
textbook." Today: concepts are stored but not queried. Defer to v3 doc.

### PYQ vs AI presentation to students
Should students see a badge ("Real Exam Question" for PYQ, "AI-generated for
practice" for manual-curated)? Probably yes, for trust. Defer to v3.

### Difficulty calibration
Mixed difficulty bug (cache has discrete; UI offered "Mixed" once). And the
Claude.ai prompt's 30/50/20 split is a guess — needs calibration after first
500 questions are generated and students attempt them. Defer.

### Retire cache-warm script
The script + its checkpoint file should be deleted from the repo once the
Claude.ai flow proves out. Not today — let it sit as fallback infrastructure
for now.

### Server-side AI scope-down
The `generate-batch` and `generate-question` edge functions stay deployed but
only get invoked from the on-demand solution path. They don't need rewrite,
just narrower call sites. Audit when admin import is live.

### Sprint mode treatment
Sprint flow consumes the same cache via `getQuestionsForUser`. Same sources,
same trust. No special handling needed.

### "Mixed" difficulty
Mobile picker has it; cache doesn't. Either remove from UI or make "Mixed"
mean "no difficulty filter" in the RPC. Defer; track as forlater item.

---

## Migration plan (ordered)

| # | What | Status | Recovery |
|---|---|---|---|
| 037 | Add `subject` column to `cached_questions` + EXAM_TAXONOMY-based backfill | ✓ Applied 2026-06-08 | Snapshot in `public.cached_questions_backup_20260608` (RLS-locked; drop ~2026-06-15 once stable) |
| 037-step-3 | `ALTER COLUMN subject SET NOT NULL` | ✗ **Dropped from plan** — see "Migration 037 residue" below | n/a |
| 038 | Add `manual-curated` to verification_status (if it's an enum) OR accept new string value (if it's a text column) | Pending | Revert |
| 039 | Update `get_unseen_questions` RPC to filter by `subject` + sort by source priority. **Must handle `subject IS NULL`** (40 legacy rows) defensively. | Pending | Revert RPC |

Migration 037 ships before admin Bulk Import (admin import sets subject
explicitly; can't do that without the column).

### Migration 037 residue — 40 rows stay NULL forever

EXAM_TAXONOMY backfill recovered **1,184 of 1,224 orphan rows (97%)** across
three passes:
- Pass 1: exact label match against the 79 unambiguous EXAM_TAXONOMY chapters
- Pass 2: `Thermodynamics` tiebreak via `question_data->>'subject'`
- Pass 3: subject-name-as-topic (`Physics`, `Chemistry`)

Plus inference passes (4–7) for variant/short-form/snake-case topic names
that aren't in EXAM_TAXONOMY but are unambiguously one subject (e.g.
`Algebra`, `Trigonometry`, `Coordination Compounds`, `Magnetism`).

The remaining **40 rows stay NULL by design**:
- **11 `Thermodynamics`** — Physics-vs-Chemistry collision; no per-row
  evidence to disambiguate (~9 are Physics-flavor, 2 lean Chemistry, 0
  have `question_data->>'subject'` set). Flagged in `forlater.md` #46
  for manual classification post-beta.
- **29 meta-filter sentinels** — `All Chapters` (12), `mixed` (9),
  `all` (8). Uploaded as cross-chapter filters; never had a single
  subject. Will stay NULL permanently.

**Why `SET NOT NULL` was dropped:** the 40 NULLs are honest. Forcing
NOT NULL would require either (a) knowingly mis-labeling the 11
Thermodynamics rows or (b) deleting them — which would cascade through
`user_question_history`, `sprint_question_attempts`,
`question_explanations`, and `cached_questions.parent_question_id` via
their `ON DELETE CASCADE` FKs. Neither is acceptable. Admin Bulk Import
(next PR) sets `subject` explicitly, so no new NULL rows enter the
table.

**Migration 039 implication:** the `get_unseen_questions` RPC update must
filter defensively — e.g. surface NULL-subject rows when querying by
`topic` even if the subject filter is set — so the 40 legacy rows
remain reachable via chapter-scoped queries while staying invisible to
pure subject filters.

---

## Decisions captured here that affect the next PR

The Admin Bulk Import UI PR will:
- Require migration 037 to be applied first
- Set `verification_status = 'manual-curated'` on inserted rows
- Set `source = '<the batch label>'`
- Set `subject = <chosen at upload time>`
- Skip duplicates by questionText hash (don't merge or overwrite — skip silently with count)
- Reject the whole batch on schema failure (no partial import)

The Architecture v3 doc (later) will capture concept tags, syllabus
equivalence, source-badged student UX, and difficulty calibration once
those become real product questions.

---

## Related docs

- `docs/learning-framework.md` — T.A.R. and D.E.E.P. methodology
- `docs/claude-chat-question-generation-prompt.md` — the prompt to paste into Claude.ai
- `forlater.md` — deferred items including concept-tag rollout, PYQ badging, Mixed difficulty
