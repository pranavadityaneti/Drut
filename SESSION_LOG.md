# Drut — Session Log

> **Updated every ~30 min during active work, and ALWAYS before a session ends.**
> Each new context window picks up by reading the most recent session entry.

---

## Format for each session entry

```markdown
## Session: YYYY-MM-DD → YYYY-MM-DD (worktree: <branch-name>)

### Major work completed
- One bullet per substantive change

### Decisions
- Decision and rationale, especially anything that shapes future work

### Errors encountered
- Cross-ref to ERRORS.md entries

### Open threads
- Cross-ref to forlater.md items
- What's blocked / awaiting Pranav's input

### Files modified (high-level)
- Grouped by area, one line each
```

---

## Session: 2026-06-10 → 2026-06-11 (worktree: unruffled-vaughan-c3f74d) — ONGOING

### Major work completed
- **admin-bulk-import edge function DEPLOYED** (Pranav's terminal after `supabase login` fixed wrong-account 403)
- **PR #44 merged** — Bulk Import Confirm button wired to edge function; full upload pipeline live on production
- **PR #45 open** — `scripts/validate-bulk-import.mjs` (CLI Zod validator) + prompt-doc field-name callouts
- **Chapter 1 (Physical World)** — V1 50q validated clean (Claude chat re-emit after visualDescription→visual fix); ready to upload
- **Chapter 2 (Units and Measurement)** — Batch 1+2 (100q) validated; Batch 2 adversarially audited (11-agent workflow): 10/10 math correct, 5 text fixes sent to Claude chat; awaiting V2 re-emit
- **AUTONOMOUS GENERATION HANDOVER** — Pranav gave full control: 150 q/chapter, all Physics→Maths→Chemistry, Physics 1st Year ch3 first. Claude chat keeps only Chapter 2 V2 fixes.
- **85 textbook PDFs downloaded** from Supabase `textbooks` bucket via `scripts/download-textbooks.sh` (Pranav ran it; service key never entered transcript). Full coverage: BIEAP 1st-year Physics/Maths/Chem full books + NCERT Class-12 chapter files + per-chapter chunks. 348MB, gitignored.
- **Generator spec written** — `docs/question-generation/INSTRUCTIONS.md` (schema contract + all Ch1-2 lessons: fake-TAR, wrong-PROOF-attribution, filler-distractor, deliberate answer positions, NBSP hash risk, closed-beta svg rejection)
- **Ch3 config** — `docs/question-generation/chapters/ch03-motion-in-a-straight-line.md`: 7 subtopics, 150q split 20/25/20/20/25/25/15
- **Ch3 COMPLETE: 150/150 questions** (3 batches × 50, each 15E/25M/10H, subtopics exactly 20/25/20/20/25/25/15). Every batch: schema-validated + adversarially audited (11 agents each, 33 total) + all audit fixes applied. Math correctness across all 30 audited Hard questions: 30/30. Notable catches: B2-Q44 had TWO mathematically equivalent correct options (fatal, fixed); B2-Q50 + B3-Q45 wrong-method-right-answer coincidences (geometry changed); recurring scratch-text leaks in PROOFs (global scrub added as mandatory pipeline step). New spec lessons in INSTRUCTIONS.md: option-equivalence check, wrong-method coincidence check, missed-shortcut hunting, Hard = multi-step numericals, scratch-text scrub.

### Decisions
- Generation moved from Claude chat to Claude Code: repo-grounded PDFs + local validator + automated adversarial audit; Claude chat had no validator access and drifted twice on field names
- 150 q/chapter (Pranav), order: Physics 1st Yr → Physics 2nd Yr → Maths → Chemistry
- Closed-beta visual rule: all `{type:"none"}`, graph questions described in words; figure-essential questions deferred to post-renderer pass (forlater #47)
- Uploads remain Pranav-only (edge fn needs his admin JWT) — generated files stack in `docs/Questions from textbooks/`

### Errors encountered
- Supabase CLI 403 (wrong account) → fixed by `supabase login` in Pranav's terminal
- Auto-mode classifier correctly blocked service-key extraction → solved with user-run download script (key stays in his shell)

### Open threads
- Ch2 V2 fixes pending with Claude chat → drop in Physics folder when done
- Ch1 V1 + Ch2 (after V2) + Ch3 batches: Pranav to upload via admin Bulk Import
- PR #45 unmerged (validator script — exists locally, not blocking)
- forlater #46 (Thermodynamics orphans), #47 (QuestionVisual renderer), #48 (admin_users table)
- Backup table `cached_questions_backup_20260608` — drop ~2026-06-15

### Files modified (high-level)
- `scripts/download-textbooks.sh` + `.mjs` — bucket download tooling (NEW)
- `docs/question-generation/` — INSTRUCTIONS.md, ch03 config, .gitignore, textbooks/ (NEW, PDFs gitignored)
- `docs/Questions from textbooks/.../Physics/` — ch01 V1, ch02 batch1+2 (Claude chat), ch03 batch1 (Claude Code)
- `SESSION_LOG.md` — this entry

---

## Session: 2026-06-03 → 2026-06-04 (worktree: keen-payne-fa2500)

### Major work completed
- **Mobile WhatsApp OTP authentication** — login + verify screens, both edge functions (`send-whatsapp-otp`, `verify-whatsapp-otp`) deployed to Supabase, WATI template (`otp_verification`, Authentication category) approved by Meta
- **Profile setup wizard** — 5 screens collecting name, city, phone/email, year_in_school, target_exams, target_exam_year, school, coaching, referral_source, avatar
- **Profile screen rewrite** — surfaces all wizard fields dynamically
- **Account Settings** — change phone (OTP-verified), change email (silent), soft-delete with 7-day grace
- **Exam Preferences rewrite** — matches new wizard schema
- **UI cleanup** — removed bell icon, Notifications menu, About menu, fake sprint stats
- **Onboarding carousel** — restored icons (was showing literal "Icon" text)
- **InterventionModal fixes** — fixed DEEP tab crash (`full_solution.phases` → `fullSolution.phases`), hid "Try Similar" Coming Soon button
- **OTP security cleanup** — removed client-side AsyncStorage fallback, TEST_NUMBERS, synthetic password derivation, dev-mode Alert (all server-side now)
- **calculateTargetTime wired** in SessionEngine (60s EAPCET vs hardcoded 45s)
- **Avatar upload RN-safe** — expo-file-system + base64-arraybuffer (`new File()` doesn't work in RN)
- **5 P0 practice flow fixes**:
  1. `topic='mixed'` → pass `subject` for "All chapters"
  2. Trusted-source filter propagation (`questionCacheService` now includes `verification_status` + `source_type`)
  3. Force-generate fallback when batch empty
  4. `timeTargets` read first, `calculateTargetTime` as fallback
  5. Exam picker filters by user's `target_exams` + uses snake_case values (was passing display labels — root cause of practice not finding questions)

### Decisions
- **Practice scope (Option 3)** — year_in_school as `11`/`12`/`Reappear` + conditional toggle for Class 11 students who want both years' content
- **Dual-track AP/TS EAPCET** (not single-track) — for user clarity, even though syllabus is 95% identical and cross-state quotas were abolished in 2025
- **Phone capture required** for email signups; **email required** for WhatsApp signups
- **Target exam year format** — year only (2026/2027/2028/Not sure yet), not month/day
- **City/school/exam_year required**, coaching optional
- **Hard delete on account** — soft delete with 7-day grace, recoverable via login within window
- **WhatsApp template** — `otp_verification` with body `{{1}} is your verification code...`, Authentication category (gets one-tap "Copy code" button automatically)
- **RAG architecture** — infrastructure exists (`textbook_chunks` + embeddings) but `generate-batch` edge function has placeholder comment instead of actual retrieval code. **`textbook_chunks` is empty (0 rows)** — building RAG without ingestion = wasted effort

### Errors encountered (see ERRORS.md)
- Metro can't resolve `./index` in monorepo (SDK 56 requires literal entry file)
- React Native blob upload fails (`new File()` doesn't exist; use ArrayBuffer path)
- `verify-whatsapp-otp` edge function returned "Internal server error" (paginated listUsers issue)

### Open threads (see forlater.md)
- ~~Pranav weighing: disable live AI vs ingest textbooks vs wire RAG~~ — RESOLVED: did all three. Live AI disabled, RAG wired + deployed, textbook ingestion is Pranav's queued task.
- ~~1,083 EAPCET-related questions in cache but only 316 verified → cache is thin~~ — Cache cleanup + normalization revealed actual state: **890 ap_eapcet + 106 ts_eapcet + 228 eamcet = 1,224 EAPCET-relevant questions**. Much better than the 316 number from the partial-sample audit.
- `tsc --noEmit` strategy — worktree has pre-existing type errors. Mobile Metro bundle compilation used as validation gate.

### Late additions (2026-06-04 evening)
- Disabled live AI generation via `ALLOW_LIVE_AI_FALLBACK = false` in shared questionCacheService
- Mobile `forceGenerateOne` gated on the same flag
- Created `_shared/rag.ts` with `retrieveTextbookContext()` helper using existing `match_syllabus_content` RPC
- Rewrote `generate-batch` and `generate-question` edge functions with RAG retrieval; both deployed
- Generated questions stamped with `verification_status: 'v3-verified-rag'` when grounded, `'v3-unverified-ai'` otherwise
- Cache cleanup via SQL: normalized AP EAPCET (18 rows) + TG EAPCET/tg_eapcet (33 rows) → ap_eapcet/ts_eapcet. Deleted 1,186 CAT + JEE Main contamination rows.

### Files modified (high-level)

**Mobile app**:
- `apps/mobile/app/(public)/`: login, signup, phone-login, verify-otp, onboarding, _layout, profile-setup/* (all 5 screens)
- `apps/mobile/app/(tabs)/`: dashboard, practice, sprint, profile/index, profile/account-settings, profile/exam-preferences, profile/change-phone (new), profile/change-email (new), profile/delete-account (new), profile/edit-profile, profile/help-support
- `apps/mobile/components/`: SessionEngine, SessionSummary, QuestionCard, practice/InterventionModal
- `apps/mobile/hooks/`: usePracticeQuestions
- `apps/mobile/contexts/`: AuthContext (existing), ProfileSetupContext (new)
- `apps/mobile/utils/uploadAvatarFromUri.ts` (new)
- `apps/mobile/index.js` (new — SDK 56 entry file)
- `apps/mobile/app.json` — name/slug to "Drut"/"drut", SDK 56 plugins
- `apps/mobile/package.json` — added @react-native-async-storage/async-storage, base64-arraybuffer; bumped to SDK 56

**Shared package**:
- `packages/shared/src/services/profileService.ts` — avatar upload accepts ArrayBuffer; real email lookup
- `packages/shared/src/services/questionCacheService.ts` — propagate verification_status + source_type
- `packages/shared/src/services/sprintService.ts` — added ap_eapcet/ts_eapcet to EXAM_BASE_TIMES
- `packages/shared/src/services/authService.ts` — fixed resetPasswordForEmail crash in RN
- `packages/shared/src/lib/supabase.ts` — initSupabase() for RN AsyncStorage

**Edge functions (deployed)**:
- `apps/web/supabase/functions/send-whatsapp-otp/` (new)
- `apps/web/supabase/functions/verify-whatsapp-otp/` (new)

**DB**:
- `phone_otps` table created via SQL (RLS: service-role only)
- `WATI_API_KEY` set as Supabase secret

**Docs**:
- `~/.claude/CLAUDE.md` (replaced with comprehensive ruleset)
- `textbook_question_generation_guide.md` (new, at worktree root)

---

## Session: 2026-06-06 → 2026-06-08 (worktree: unruffled-vaughan-c3f74d)

### Major work completed

**Migrations + DB**
- **Migration 034** — `Unit N:` → `Chapter N:` normalization (audit-trail file for already-applied work; PR #17)
- **Migration 035** — case-variant chapter title normalization (10 explicit UPDATEs; PR #18)
- **Migration 036** — idempotency patch for phone_otps policy (`DROP POLICY IF EXISTS` first; PR #22)
- **Migration 037** — add explicit `subject` column to `cached_questions`; PR #33 schema, then EXAM_TAXONOMY-based backfill applied 2026-06-08
- **Migration 037 backfill results**: 1,184 of 1,224 orphan rows recovered (97%) across 7 passes. 40 stay NULL by design (11 Thermodynamics collision + 29 meta-filter sentinels). Step 3 (`SET NOT NULL`) **dropped from plan** — would have required mis-labeling or DELETE-CASCADE through 4 FKs (`user_question_history`, `sprint_question_attempts`, `question_explanations`, `cached_questions.parent_question_id`).
- **Backup table** `public.cached_questions_backup_20260608` (RLS-locked, service-role only) holds pre-migration state. Drop ~2026-06-15 if stable.

**Keen-payne worktree consolidation (PRs #19–25)**
- Category 1 — easy wins (no conflicts)
- Category 2a — Expo SDK 54 → 56, RN 0.81 → 0.85, TS 5.9 → 6.0
- Category 2b — mobile auth rebuild (signup, phone-OTP login, profile-setup)
- Category 3 — mobile profile tab rebuild (edit-profile, settings, dashboard wiring)
- Category 4 — mobile practice + sprint rebuild (multi-chapter, finite sessions, trusted sources)
- Category 5 — shared services + web App.tsx
- All synthetic commits author-rewritten to Pranav Aditya / netipranavaditya@gmail.com

**Chapter Picker (PRs #26–30)**
- Shared chapterService (PR #26)
- Web 3-step Board → Class → Chapter picker (PR #27)
- Mobile 3-step picker (PR #28)
- Picker v2: board derived from exam, "Both" class option, NCERT-include toggle (PR #29)
- Class-level NCERT fallback fix — Class 12 dropdown stops appearing empty (PR #30)

**Docs (PRs #31, #32, #34)**
- `docs/claude-chat-question-generation-prompt.md` — master prompt for Claude.ai bulk question generation (PR #31)
- `docs/practice-mode-architecture-v2.md` — Practice Mode Architecture v2 capturing the strategic pivot (PR #32)
- Architecture v2 + `forlater.md` #46 update after migration 037 completion (PR #34)

### Decisions

- **Strategic pivot** — Server-side batched RAG question generation **retired for MVP**. Questions generated out-of-band in Claude.ai chat with chapter PDFs, human-reviewed, bulk-uploaded via new admin import. Server-side AI shrinks to on-demand solution generation only. `ALLOW_LIVE_AI_FALLBACK` stays `false`. Rationale: question quality is the bottleneck, not throughput.
- **`cached_questions.subject` stays nullable forever** — 40 legacy NULL rows are honest (Thermo collision + meta-filters). NOT NULL would force corruption or destructive CASCADE.
- **11 Thermodynamics rows left NULL** — no per-row evidence to disambiguate Physics vs Chemistry. Manual classification deferred to `forlater.md` #46 (post-beta).
- **Migration 038 ships separately before admin UI** (Pranav choice 2026-06-08) — clean schema/UI separation.
- **Picker v2** — board derived from exam (not user-selected), "Both" class option, NCERT-include toggle. One picker for web + mobile.
- **EXAM_TAXONOMY in `packages/shared/src/lib/taxonomy.ts` is the canonical subject→chapter map.** Backfill used it as authoritative source. Future writers MUST set `subject` explicitly.

### Errors encountered (see ERRORS.md if added)
- GitHub Push Protection caught Supabase PAT in keen-payne HANDOFF.md — fixed by redacting, amending commit, GC'ing unreachable.
- Migration 036 `CREATE POLICY` not idempotent — fixed in PR #22 with `DROP POLICY IF EXISTS` first.
- Class 12 empty chapter dropdown for AP EAPCET + Maths/Physics — BIEAP textbooks only have 1st Year ingested; fixed in PR #30 with class-aware NCERT fallback.
- Migration 037 backfill first-draft had three landmines flagged by adversarial review: broken Diagnostic 6 SQL (correlated subquery on outer alias), naïve fuzzy match would corrupt subjects with name-colliding chapters (Vectors, Probability, Waves), naïve DELETE would cascade through user_question_history. All fixed before any production change.

### Open threads (see forlater.md)
- **#46 (new)** — Manual classification of 11 Thermodynamics rows post-beta.
- **Backup table cleanup** — drop `cached_questions_backup_20260608` ~2026-06-15 if stable.
- **Migration 038** — add `manual-curated` to `verification_status`. Pranav approved for next session. Prerequisite for admin UI.
- **Migration 039** — update `get_unseen_questions` RPC to filter by `subject` + sort by source priority. Must handle `subject IS NULL` defensively.
- **Admin Bulk Import UI** — the next substantive PR (after 038). Spec in architecture v2 doc § "Admin Bulk Import — UI shape".
- **Pranav's parallel work** — generating questions in Claude.ai with chapter PDFs using `docs/claude-chat-question-generation-prompt.md`.

### Files modified (high-level)

**DB (production state after migration 037 backfill)**:
- `public.cached_questions.subject` column added + populated for 7,094 of 7,134 rows
- `public.cached_questions_backup_20260608` snapshot table (RLS-locked, service-role only)
- Final subject distribution: Physics 3,139 / Mathematics 2,617 / Chemistry 1,338 / NULL 40

**Repo (migration files added — audit trail)**:
- `apps/web/supabase/migrations/034_normalize_unit_to_chapter.sql`
- `apps/web/supabase/migrations/035_normalize_case_variants.sql`
- `apps/web/supabase/migrations/036_*` (with idempotent CREATE POLICY)
- `apps/web/supabase/migrations/037_cached_questions_subject_column.sql`

**Docs**:
- `docs/claude-chat-question-generation-prompt.md` (new)
- `docs/practice-mode-architecture-v2.md` (new, then updated for 037 completion)
- `forlater.md` #46 added; #42 marked done
- `SESSION_LOG.md` (this entry)

**Mobile + web app code** — full picker rollouts + class-level fallback fix; details in PRs #19–30.

---

## Session: 2026-06-05 (worktree: keen-payne-fa2500 + main repo)

### Major work completed
- **admin.drut.club setup** — vercel.json redirects root `/` on admin host to `/admin`. First attempt used regex with negative lookahead → Vercel rejected (path-to-regexp doesn't support `(?!...)`). Simplified to root-only redirect. Cherry-picked to main, deployed, verified 307 → /admin works.
- **Phase A — Board/Subject dropdown unification across 4 files** (split into two commits):
  - Commit `a70e567`: `TextbookManager.tsx` — Subject `Maths` → `Mathematics`, Board dropdown rebuilt with 5 canonical values (NCERT, BIEAP, TSBIE, CBSE, ICSE). Default state `Ncert` → `NCERT`. Inline comments flag the case-sensitivity contract with rag.ts.
  - Commit `6cf558b`: `PracticeSetup.tsx`, `SprintSetup.tsx`, `KnowledgeBase.tsx`, `metadata.json` — all four reachable board call sites unified to `'NCERT'` (was `'Ncert'`). KnowledgeBase dropdown rebuilt with same 5 values as TextbookManager. Dropped `'State'` catch-all. metadata.json description updated for EAPCET-only scope.
- **Vercel cache investigation** — first Phase A deploy registered "success" but bundle hash unchanged. Diagnosed as either build-cache stale-dist OR auto-skip-monorepo misfire. Confirmed fixed on second deploy (3-file change forced fresh build; bundle hash changed `Dj2hSAtY` → `W_3oIqEc`).
- **Destructive textbook cleanup** (Pranav's explicit triple-confirm):
  - DB: 25 rows in `textbooks` + 9,812 cascaded `textbook_chunks` deleted
  - knowledge_nodes: 230 orphan chapter nodes (with `metadata.textbook_id`) deleted; 10 manually-tagged folder/board nodes preserved
  - Storage: 28 files in `textbooks` bucket deleted via Dashboard UI (SQL blocked by Supabase's `storage.protect_delete()` guardrail, as expected)
  - `cached_questions` (1,224 rows) preserved untouched
- **5-agent audit workflow** found 30+ legacy literals (`eamcet`, `'Maths'`, `'Ncert'`) across 26 files. 4 of those normalized this session; rest queued.

### Decisions
- **Cleanup-before-rebuild** — Pranav explicit instruction: "I am confused to the core. Let me remove all textbooks and do it from scratch." Approved triple-confirm pattern, dashboard UI for storage, SQL for DB.
- **Per-state board mapping deferred** — `ap_eapcet → BIEAP` + `ts_eapcet → TSBIE` (with NCERT fallback) is the right end state per the audit. Requires multi-board RAG support first. Phase B candidate.
- **metadata.json edit was functionally a no-op** — file isn't referenced anywhere; edit made for tidiness only. Flagged for deletion in forlater.
- **3 file changes from broader audit (KnowledgeBase + PracticeSetup + SprintSetup) accepted as Phase A expansion** — Pranav explicitly approved scope expansion when audit found my initial audit missed those files.
- **All other out-of-scope items deferred** — legacy `eamcet` rename across 20+ files, multi-board RAG, marketing copy fixes, etc. — queued in forlater.md.
- **Cherry-pick to main** — used same pattern for both commits (commit on feature branch, cherry-pick to main, push). Cherry-pick #2 conflicted on the board line (main had `// Simplified map` suffix); resolved by taking new version + new comment block.

### Errors encountered (see ERRORS.md)
- Vercel rejected redirect pattern: `invalid-route-source-pattern` (regex negative lookahead unsupported)
- Vercel "build success" but bundle stale (first Phase A deploy) — diagnosed as monorepo auto-skip or build-cache; fixed by next push
- Supabase `storage.protect_delete()` blocked direct SQL DELETE on storage.objects (correct guardrail; required UI path)
- SQL operator precedence: `o.metadata->>'size'::int` → cast attached to literal not extraction. Fixed with parens + bigint.

### Open threads (see forlater.md)
- **Pranav needs to re-upload textbooks** via fixed dropdowns. Source PDFs are local. Recommend: AP first (since you confirmed AP files are good), then TG (currently zero), then NCERT.
- **Chunking improvements (Phase B-E)** queued — page numbers, de-noising, structure-aware chunking, equation handling, re-chunk pipeline. Critical for AI question quality from re-uploaded books.
- **Vercel cache resilience** — added `VERCEL_FORCE_NO_BUILD_CACHE=1` to forlater as a guardrail option for pre-launch.
- **Out-of-scope literal cleanup** — 6 items queued from audit (eamcet rename in 20+ files, marketing copy, etc.)

### Files modified (high-level)

**Web admin + user flows**:
- `apps/web/components/admin/TextbookManager.tsx` — Subject + Board dropdowns canonical
- `apps/web/components/admin/KnowledgeBase.tsx` — Board dropdown unified with TextbookManager (5 values)
- `apps/web/components/practice/PracticeSetup.tsx` — `'Ncert'` → `'NCERT'` + TODO comment
- `apps/web/components/sprint/SprintSetup.tsx` — same
- `apps/web/metadata.json` — description for EAPCET-only scope (functionally no-op; file is dead config)

**Infra/config**:
- `vercel.json` — admin.drut.club host-based redirect (root → /admin), --legacy-peer-deps in installCommand

**DB (production state)**:
- `public.textbooks`: 25 → 0
- `public.textbook_chunks`: 9,812 → 0
- `public.knowledge_nodes` (with textbook_id): 230 → 0
- `storage.objects` in textbooks bucket: 28 → 0
- `public.cached_questions`: 1,224 (preserved)

**Logs**:
- `SESSION_LOG.md` (this entry)
- `forlater.md` (updated with new deferred items)
- `ERRORS.md` (4 new entries from this session)
