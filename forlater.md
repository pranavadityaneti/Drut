# Drut — Deferred Work Queue

> **Read this at the start of every session.** Surface a short summary to Pranav before proceeding: "You have N items queued — top 3 are X, Y, Z. Want to tackle any?"
>
> When a queued item becomes active → move from "Active queue" → "In progress".
> When done → move to "Done — archived" with completion date. Never silently delete.
> When new work is deferred → add here immediately. Don't trust memory.

---

## Active queue

### 🔴 P1 — Critical for beta
1. **Wire `practice_scope` into question filter**
   - What: Profile-setup wizard collects `practice_scope` ('class_11' vs 'class_11_and_12') but no code reads it. Class 11 students who want both years' content can't get them.
   - Scope: `usePracticeQuestions.ts` filter logic + `cached_questions` query
   - Originated: practice audit, 2026-06-04

2. **Mobile pause/resume mid-session**
   - What: Web persists session state to localStorage; mobile doesn't. Beta users can't leave a session and come back.
   - Scope: `SessionEngine.tsx` + AsyncStorage snapshot
   - Originated: practice audit, 2026-06-04

3. **Skip-with-debt tracking**
   - What: Web records `skipDrill: true` to mark FSM mastery debt when user skips intervention; mobile doesn't. Spaced-rep signal lost.
   - Scope: `SessionEngine.tsx` intervention-close path
   - Originated: practice audit, 2026-06-04

### 🟠 P2 — Post-beta improvements
4. **Mobile analytics tab** — 14 functions in `@drut/shared`, mobile uses 1 (`fetchUserStreak`). Web has full analytics surface; mobile has none.
5. **Sprint architecture plan** — separate planning session needed. Use RAG vs pure AI? How to wire filters/difficulty/leaderboard? Sprint is currently structurally broken.
6. **`preloadFirstQuestion` on mobile login** — web calls it on app boot for snappy first-question render. Adds 1-3s of perceived latency on mobile.
7. **RAG wiring in `generate-batch`** — infrastructure exists but disconnected. Will be useless until textbook chunks are ingested (see #17). Plan: embed query → search `textbook_chunks` → inject top-K into Gemini prompt.

41. **T.A.R. / D.E.E.P. detailed framework session** *(added 2026-06-06)*
    - What: 4 open questions surfaced in `docs/learning-framework.md` need decisions before content scales — (1) structured vs embedded T.A.R. step labels (today they're embedded as `**Trigger:**` markdown), (2) enforce 3-step T.A.R. via Zod `.length(3)`, (3) sort D.E.E.P. phases by canonical order on display, (4) wire incorrect-answer T.A.R.→D.E.E.P. nudge into practice loop
    - Scope: AI prompts (generate-batch, generate-question), Zod schema, SolutionView UI, practice flow logic
    - Why deferred: Pranav called for separate dedicated session
    - Originated: SolutionView rebuild session, 2026-06-06

42. **NewPractice editorial styling joint pass** *(deferred from PR #8, 2026-06-06; closed by PR #15 2026-06-07)* — ~~deferred~~ DONE
    - PR #15 applied a targeted editorial pass on NewPractice's orchestrator surfaces (loading state, error card, top nav, continue buttons, emoji removal) while preserving PR #4's `language?` setupConfig field.

45. **UI redesign — make it engaging, not dull** *(added 2026-06-07)*
    - What: The current editorial system shipped via PRs #1–#15 on 2026-06-06 feels dull and not engaging when used in practice. Hairline cards + warm paper + monochrome ink ramp + coral accent produced a calm magazine aesthetic that doesn't match the energy a competitive-exam practice app needs to sustain student attention.
    - Pranav's words: "It's dull and sad. We'll rework when I am bored of building the main architecture."
    - When: After the main architecture is solid — RAG-grounded question sourcing works end-to-end, seeded questions surface correctly, intervention shows both Quick Method and Full Solution methods, fallback paths are visible not silent. Do NOT restart UI work until the core practice loop is reliable.
    - Scope: full visual revisit, not a tweak. Likely means trading the editorial system for something with more visual energy — stronger color contrast, more hierarchy, considered motion that pulls attention, possibly imagery / illustration / icon systems beyond lucide line icons.
    - Originated: Practice flow testing, 2026-06-07
    - Scope: re-apply editorial styling (hairline cards, ink ramp, lime accents, no emojis) section by section while preserving PR #4 type fix and any other type-correct refinements
    - Approach: hand-merge in dedicated session — review phase-11's intended changes (visible in `ui/editorial-redesign` reference branch), apply only the styling deltas
    - Originated: PR #8 editorial revamp, 2026-06-06

48. **DB-level admin enforcement for admin-bulk-import (replace email-allowlist constant)** *(added 2026-06-09)*
    - Context: The `admin-bulk-import` edge function (PR #4b) uses a hardcoded email allowlist in `apps/web/supabase/functions/_shared/admin-allowlist.ts`. Adversarial review flagged this as the only line of defense — service role bypasses RLS, so a compromised email check exposes the entire `cached_questions` write surface (and via service role, every other table). Pranav accepted the trade-off for closed beta (1–2 admins, 6-day timeline). Mitigation post-beta:
    - **Action when ready**:
      1. New migration: `CREATE TABLE public.admin_users(user_id uuid PK REFERENCES auth.users(id), email text, can_bulk_import boolean DEFAULT true, revoked_at timestamptz, granted_at timestamptz DEFAULT now())`. RLS: only service role can write; admins can SELECT their own row.
      2. New Postgres RPC `check_admin_can_bulk_import(user_id uuid) RETURNS boolean` — checks `revoked_at IS NULL AND can_bulk_import` in the admin_users table.
      3. Modify `admin-bulk-import/index.ts`:
         - Use the **anon client + user's JWT** to call the RPC FIRST.
         - Only on `true` do we swap to the service role client for the upsert.
         - Remove the hardcoded `ADMIN_EMAILS` constant; trust the DB.
      4. Seed the table with current admins via a migration: `INSERT INTO admin_users (user_id, email) SELECT id, email FROM auth.users WHERE email IN (...);`
    - **Revocation flow post-upgrade**: `UPDATE admin_users SET revoked_at = now() WHERE email = '...'`. No redeploy required.
    - **NOT urgent** — closed beta has 2 admins (Pranav + himself) and the email check works. Re-evaluate post-launch if admin count grows or revocation becomes a real concern.
    - Files referenced: `_shared/admin-allowlist.ts` (delete), `admin-bulk-import/index.ts` (rewrite auth check), new migration `041_admin_users_table.sql`.
    - Originated: PR #4b adversarial review, 2026-06-09.

47. **RDKit-JS + SVG renderer for Bulk Import questions** *(added 2026-06-09)*
    - Context: Strategy A + D from the diagram-strategy decision (2026-06-09). Schema `visual` discriminated union now accepts `{type: 'svg', svg}` for graphs/geometry/circuits/ray-diagrams and `{type: 'smiles', smiles}` for organic chemistry molecules. The schema is shipped; the RENDERER hasn't been built yet.
    - **Action when ready** (folded into PR #2b — admin Bulk Import UI):
      1. Install RDKit-JS in `apps/web` (`npm i @rdkit/rdkit`) — ~5MB WASM, lazy-loaded.
      2. Create `apps/web/components/practice/QuestionVisual.tsx` — discriminated component:
         - `type: 'none'` → render nothing
         - `type: 'svg'` → sanitize markup (allowlist of SVG elements + attributes per the prompt's DIAGRAMS constraints) and inline via dangerouslySetInnerHTML on a wrapper div
         - `type: 'svg'` sanitization: use existing `packages/shared/src/lib/svgSanitizer.ts` if its allowlist matches our prompt constraints, otherwise write a tighter sanitizer scoped to the Bulk Import allowlist (rect, circle, line, path, text, polyline, polygon, ellipse, g, defs, marker, linearGradient, stop)
         - `type: 'smiles'` → lazy-load RDKit, call `RDKit.get_mol(smiles).get_svg(width, height)`, render the returned SVG via the same sanitization pass as Case 2
      3. Wire `QuestionVisual` into `QuestionCard.tsx` (web + mobile if applicable)
      4. BulkImport.tsx preview should also render the visual inline (small thumbnail) so Pranav can spot-check before upload
    - **NOT urgent until PR #2b lands**. Track here so the work isn't forgotten when admin UI shipping starts.
    - **Sanitization scope**: even though the prompt constrains Claude to a safe subset, do not skip sanitization at render time. The sanitizer is the security boundary, not the prompt.
    - Originated: 2026-06-09 diagram strategy decision (Strategy A + D).

46. **Manually classify 11 `Thermodynamics` orphan rows** *(added 2026-06-08)*
    - Context: Migration 037 backfilled `cached_questions.subject` from EXAM_TAXONOMY across 7 passes. 1,184 of 1,224 orphan rows recovered (97%). 40 remain NULL by intentional design (see `docs/practice-mode-architecture-v2.md` § "Migration 037 residue").
    - **11 `Thermodynamics` rows** — Physics-vs-Chemistry collision. EAMCET has a chapter named "Thermodynamics" in both subjects. Probe (2026-06-08) showed ~9 are Physics-flavor (Carnot engines, P-V diagrams, ideal-gas processes, adiabatic γ=5/3, one mis-labeled mechanics question) and 2 lean Chemistry (standard enthalpy of formation of H₂O). No `question_data->>'subject'` set for any. 5 of the 11 are `v3-verified-pyq` (real exam papers — high value).
    - **Pranav decision 2026-06-08**: leave NULL until manual classification. Don't introduce knowingly-wrong labels. Cost: these rows are invisible to subject-scoped queries but still served via `topic = 'Thermodynamics'` filters.
    - **Action when ready**:
      ```sql
      SELECT id, source, verification_status,
             LEFT(question_data->>'questionText', 200) AS preview
      FROM public.cached_questions
      WHERE subject IS NULL AND topic = 'Thermodynamics';
      ```
      Read each preview, tag as `Physics` or `Chemistry`, then `UPDATE` per id.
    - **29 meta-filter rows** — `All Chapters` (12), `mixed` (9), `all` (8). Uploaded as cross-chapter filter sentinels; no single subject possible. Will stay NULL permanently. NOT actionable.
    - **Migration 037 step 3 (`SET NOT NULL`) dropped from plan.** Column stays nullable forever. Admin Bulk Import (next PR) sets `subject` explicitly so no new NULL rows enter.
    - **Backup table**: `public.cached_questions_backup_20260608` (RLS-locked, service-role only) holds pre-migration state. **Drop after ~2026-06-15** if nothing surfaces.
    - Originated: Migration 037 EXAM_TAXONOMY backfill session, 2026-06-08.

### 🟡 P3 — Nice-to-have
8. **Restore "Practice Again" button** in `SessionSummary.tsx` (currently commented out).
9. **Wire "Try Similar" mini-drill** — currently hidden in InterventionModal. Web has `handleProveIt` calling `getQuestionByFsmTag`.
10. **Slow-but-correct intervention trigger** — web opens InterventionModal even when correct-but-slow. Mobile only opens on wrong.
11. **Mid-session difficulty change** — web allows via dropdown; mobile locked at session start.

### ⚙️ Tech debt / cleanup
12. **`validate-otp-only` edge function** — change-phone currently calls `verify-whatsapp-otp` which creates an orphan `<phone>@phone.drut.club` user account. Need a function that just validates the OTP without provisioning.
13. **Soft-delete cron job** — accounts marked `deletion_requested_at` never actually purge after 7 days. Need Supabase pg_cron or scheduled function.
14. ~~Cache contamination cleanup~~ — **DONE 2026-06-04**. Deleted 1,186 CAT + JEE Main rows via SQL.
15. ~~Schema normalization~~ — **DONE 2026-06-04**. Normalized "AP EAPCET"→ap_eapcet (18 rows) and "TG EAPCET"/tg_eapcet→ts_eapcet (33 rows). Total recovered: 51 verified questions.
16. **KaTeX local bundling** — currently loaded from CDN on every question render. Breaks offline. Same root cause as the web CDN importmap issue in memory.
17. **LatexText WebView consolidation** — spawns 5 WebViews per question card (1 question + 4 options). Memory/perf hazard on Android.
18. **`useDashboardData.speedScore` vs "Accuracy" label** — dashboard shows the value labelled "Accuracy" but the field name is `speedScore`. Either rename field or fix label.
19. **Mobile TypeScript errors** — worktree has pre-existing type resolution errors for `@react-navigation/bottom-tabs`. Blocks strict `tsc --noEmit` on every change.
20. **Textbook ingestion (Pranav's task)** — `textbook_chunks` still empty. RAG code is wired and deployed; will start working the moment NCERT PDFs land via `ingest-textbook`.
21. ~~Disable/gate live AI generation~~ — **DONE 2026-06-04**. `ALLOW_LIVE_AI_FALLBACK = false` in `questionCacheService.ts`. Flip to `true` once RAG-grounded generation is verified after textbook ingestion.
22. **RAG smoke test** — once first textbook is ingested, manually invoke `generate-batch` for a chapter from that textbook and verify the response's `rag.enabled = true` + `chunkCount > 0` + question content traces to retrieved text.

43. **MobileNav admin allowlist sync** *(2026-06-06)* — `apps/web/components/MobileNav.tsx` is missing `pranav.n@drut.club` to match migration `029_admin_only_storage_textbooks.sql` + `Sidebar.tsx`. One-line edit. Security-relevant — should be its own small PR, not bundled with visual work. Flagged across PRs #1, #7, #11.

44. **AdminIngestion → `@drut/shared` barrel cleanup** *(2026-06-06)* — `AdminIngestion.tsx` imports `ingestAndRefineQuestion` via deep path `../../../packages/shared/src/services/contentRefinery`. Cleaner: (a) add `export * from './services/contentRefinery'` to `packages/shared/src/index.ts`, (b) change AdminIngestion import to `from '@drut/shared'`. Flagged in PR #3 body.

### 📚 Chunking quality — Phase B-E (added 2026-06-05)

Audited in the 2026-06-05 chunking review. Cleaner ingestion is the biggest quality lever for AI questions; tackle in order.

23. **Phase B — De-noising + page numbers in chunks** *(~1-2 hour change, requires re-chunking all books)*
    - Switch from raw `pdf.text` to page-aware extraction (`pdfjs-dist` or pdf-parse callback API)
    - Strip running headers/footers via heuristic (lines repeating on every page)
    - Store `page_number` per chunk (column exists, currently NULL)
    - Store `metadata: { chapter, subject, board, class }` per chunk
    - File: `apps/web/supabase/functions/ingest-textbook/index.ts` lines 169-222

24. **Phase C — Structure-aware chunking** *(~half day; biggest correctness improvement)*
    - Respect chapter boundaries (use the already-extracted syllabus)
    - Sentence/paragraph-boundary splits (use `\n\n` and `. ` as soft boundaries)
    - Adaptive chunk size: smaller for equation-heavy regions
    - Depends on Phase B landing first

25. **Phase D — Equation extraction for Math/Physics/Chem** *(decision-level)*
    - Real fix: math-aware PDF parser (Mathpix API, LaTeX-OCR via Nougat). Costs $ per page.
    - Currently equations come out garbled — biggest single quality issue for STEM
    - Wait until B+C are done before deciding; may not be needed if B+C give enough lift

26. **Phase E — Re-chunk-only pipeline + sampling verification** *(~3 hours)*
    - New `rechunk-textbook` edge function (wipes + redoes chunks, keeps TOC)
    - Currently `reprocess-all-textbooks` uses `skipChunking: true` — no way to re-chunk without re-ingest
    - Add sampling step: random 5 chunks per book → human review in admin UI

### 🎨 Out-of-scope literal cleanups (audit findings 2026-06-05)

27. **Legacy `eamcet` → `ap_eapcet`/`ts_eapcet` rename in 20+ files** — services, types, edge functions, LLM prompts, Zod schemas. Currently works due to `028_migrate_eamcet_users.sql` back-compat, but accumulates risk. Files: `packages/shared/src/constants.ts`, `types.ts`, `services/vertexBackendService.ts`, `services/sprintService.ts`, `services/contentRefinery.ts`, `services/geminiService.ts`, `lib/ai/schema.ts`, plus edge functions `generate-batch/index.ts`, `generate-question/index.ts`, `bulk-ingest/index.ts`, `_shared/types.ts`, `_shared/vertex-client.ts`. **Risk**: could break question generation if eamcet key removed before all readers migrate. Plan as a dedicated rename session with codemod.

28. **WaitlistClassic.tsx line 1093** — `<option value="TS EAMCET">` (sibling of AP EAPCET option). Value goes into waitlist DB; renaming requires migration of existing waitlist rows.

29. **`apps/web/landing/index.html` line 92** — standalone landing page with `<option value="Eamcet">Eamcet</option>`. Outside the React waitlist flow. Same DB-value concern.

30. **LandingPage.tsx marketing copy lines 69, 259** — "Personalized practice...for CAT, JEE, and EAMCET." Outdated for EAPCET-only MVP. Needs Pranav's preferred copy direction before editing.

31. **NewPractice.tsx line 408** — `setBoard(config.board || 'CBSE')` default. For EAPCET-only product the fallback should be `'NCERT'`. Behavior change — needs verification of which call sites set config.board explicitly.

32. **027_enable_all_exams.sql** — migration uses display labels `["AP EAPCET", "TG EAPCET"]` not canonical `ap_eapcet`/`ts_eapcet`. Already deployed; if it caused data inconsistency, write a corrective migration. Otherwise low priority.

33. **`apps/web/metadata.json`** — confirmed dead config (not referenced anywhere in codebase; not bundled; not served as static). Edited 2026-06-05 to remove CAT/JEE/EAMCET mention but the change is invisible. **Recommend deleting the file entirely** to reduce confusion.

### 🏗️ Architectural — Phase B+ candidates

34. **Multi-board RAG / per-state textbook query** — current PracticeSetup/SprintSetup map all EAPCET to single board `'NCERT'`. After re-upload with separate BIEAP and TSBIE books, AP students should query BIEAP+NCERT and TS students should query TSBIE+NCERT. Requires: rag.ts `filter_board` accepting an array, SQL `match_syllabus_content` RPC supporting IN-clause, PracticeSetup/SprintSetup passing array based on exam.

35. **PYQ papers as separate table** — earlier audit identified 10 QPK_*_MAY_SHIFT_* "Question Paper Key" docs ingested as textbooks. They belong in a `pyq_papers` table with paper-specific fields (exam_year, shift, date). When re-uploading, **don't re-upload QPK files via TextbookManager** — wait for the proper table.

### ⚙️ Infra resilience

36. **`VERCEL_FORCE_NO_BUILD_CACHE=1` env var** — add to Vercel project as permanent guardrail. Costs ~30-60s per build; eliminates the entire class of "deploy success but stale bundle" bugs that bit us on 2026-06-05. Recommended pre-launch.

38. **OCR fallback for scanned PDFs via Gemini multimodal** *(added 2026-06-06)*
    - Trigger: 2026-06-06 BIEAP Chemistry 1st year part-1 + part-2 uploads detected as scanned (0 chars extracted from 157 + 137 pages). MIN_EXTRACTED_CHARS=5000 guard correctly flagged as `partial-extraction`. Pranav deferred OCR integration to focus on NCERT + PYQ ingestion first.
    - Recommended: Gemini multimodal (2.5 Pro for dense math/equation pages, 2.5 Flash for prose). Reasons: zero new credentials (same API key Drut already uses), excellent math/LaTeX output, accepts PDF directly, runs cleanly in Deno via fetch. Volume (~5-10 scanned books × ~300-500 pages) is tiny — within Flash free tier; even Pro = ~$5-15 total ingestion cost.
    - Fallback service: Mistral OCR (`mistral-ocr-latest`, $0.002/page). Excellent math, simple REST endpoint. Worth keeping in pocket if Gemini quality on a specific book disappoints.
    - Architecture sketch: targeted OCR (only pages with <50 chars), server-side inside ingest-textbook, runs BEFORE the partial-extraction early-return. Requires either (a) re-downloading the PDF buffer on server for the OCR path, OR (b) client sends PDF buffer in fallback mode. Build estimate: 3-4 hours focused work.
    - Reference workflow: wcd9bxv5p (2026-06-06).
    - Don't integrate until at least one of: (i) Chemistry books truly needed for beta, (ii) Pranav has time to test it, (iii) beta launches and OCR'd books become a known requirement.

40. **Auto-dedup chapter knowledge_nodes inside ingest-textbook** *(added 2026-06-06)*
    - Context: NCERT per-chapter PDFs (one PDF per chapter, kech101 / kech102 / …) cause the TOC extractor to emit each chapter title 2-3 times → duplicate `topic` rows under the subject folder. Migration 033 cleans up existing dupes but doesn't prevent future ones.
    - Pranav decision 2026-06-06: **OPTION A — manual re-runs on demand.** When a batch of uploads finishes, Pranav says "dedup" and the SQL from migration 033 gets re-applied via the Management API. NOT auto-integrated into ingest-textbook.
    - Re-evaluate post-beta: if manual re-run cadence becomes annoying, switch to Option B — add ~5 lines to ingest-textbook (after the chapter inserts) that re-run the same dedup query scoped to the current subject_node. Idempotent + cheap.
    - SQL is in `apps/web/supabase/migrations/033_dedup_chapter_knowledge_nodes.sql` — copy-paste into Management API or SQL Editor to re-apply.

39. **Push migration rename `030_clean_knowledge_hierarchy.sql` → `032_` to main** *(added 2026-06-06)*
    - Renaming committed on feature branch `claude/keen-payne-fa2500` as commit `c7f3f41`. Cherry-pick to main blocked 2026-06-06 by uncommitted local work in main repo (global.css MM, package-lock.json M, .temp/cli-latest M).
    - Migration ALREADY APPLIED on production via Management API on 2026-06-05; rename is repo-hygiene only, zero DB impact.
    - To unblock: either (a) commit/stash Pranav's local main changes then cherry-pick c7f3f41 + push, OR (b) do the rename freshly on main without cherry-picking.
    - Why it matters at all: both `030_staging_extensions.sql` (pre-existing) and `030_clean_knowledge_hierarchy.sql` (mine) share the `030_` prefix. `supabase db push` against a fresh DB would pick an implementation-defined order. Non-urgent because (a) production already has both applied and (b) the two migrations touch different tables. Fix when convenient.

37. **Post-beta: evaluate isolated component migration off Supabase** *(added 2026-06-06)*
    - Decision context: Pranav asked about full Supabase → AWS migration during the multi-day infra rebuild session. Analysis: all current Supabase pain (256MB edge memory cap, 50MB storage default, `text-embedding-004` retirement, spotty function logs, RLS field-name issues) was solved or trivially worked around. Wholesale migration cost: 2-4 weeks of solo founder time. Beta timing: ~1 week. Decision: STAY on Supabase for beta.
    - Post-beta evaluation criteria: if specific Supabase issues recur at frequency ≥1/week, evaluate isolated migration of the problematic component (e.g., heavy embedding workloads → AWS Lambda, vector search → Pinecone, function logs → external aggregator) rather than wholesale migration.
    - Candidate components to potentially isolate first: (a) edge functions hitting memory cap (currently solved via hybrid pipeline, but if AI-heavy ingestion grows, Lambda's configurable memory wins), (b) vector search if pgvector latency stops scaling.
    - NOT a today task. Re-evaluate at end of beta or first month post-launch.

## In progress
*(empty — items move here when actively being worked on)*

## Done — archived

- **2026-06-04** — Cache contamination cleanup: deleted 1,186 CAT + JEE Main rows
- **2026-06-04** — Schema normalization: recovered 51 quarantined EAPCET questions (18 AP + 33 TS)
- **2026-06-04** — Live AI fallback flag added: `ALLOW_LIVE_AI_FALLBACK = false`
- **2026-06-04** — RAG wired in `generate-batch` + `generate-question` (deployed). Awaiting textbook ingestion to activate.
