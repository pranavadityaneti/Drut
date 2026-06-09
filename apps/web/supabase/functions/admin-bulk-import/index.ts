// Admin Bulk Import — ingests Claude.ai-generated question batches.
//
// This is the WRITE PATH for the admin Bulk Import UI flow:
//   docs/practice-mode-architecture-v2.md § "Admin Bulk Import — UI shape"
//
// SECURITY (see design doc + adversarial review, PR #4b workflow):
//   - Bearer JWT verified server-side via supabaseAnon.auth.getUser()
//     (NOT decoded locally — relies on Supabase's GoTrue verification
//     against the project's signing key)
//   - Email checked against ADMIN_EMAILS allowlist in
//     _shared/admin-allowlist.ts. Forlater #48 tracks moving this to a
//     DB-level admin_users table post-beta for revocation-without-redeploy.
//   - SVG visuals REJECTED at validation for closed beta. The render-side
//     sanitizer (forlater #47, PR #2c) isn't shipped yet, and the
//     adversarial review showed regex-based ingest sanitization is
//     trivially bypassable. Only `{type:'none'}` and `{type:'smiles'}`
//     accepted. Re-enable SVG when QuestionVisual + DOMPurify lands.
//   - jee_main: true REJECTED at validation (EAPCET-only scope for beta).
//   - Service-role client used for the actual INSERT (bypasses RLS).
//     Acceptable because admin email is verified upstream — the email
//     check IS the only line of defense; flagged as a design trade-off.
//
// HASH:
//   - question_text_hash via _shared/hash.ts.
//   - MUST match migration 040's Postgres backfill byte-for-byte.
//   - See _shared/hash.ts for the POSIX-vs-JS-`\s` divergence and the
//     NFC normalization rationale. The implementation PR MUST run a
//     fixture verification (5+ inputs) against a live staging DB before
//     this function is deployed to production.
//
// LIMITS:
//   - questions per request: 1–100
//   - request body: 8MB (Content-Length pre-check)
//
// DEDUP:
//   - .upsert(rows, { onConflict: 'question_text_hash,exam_profile',
//     ignoreDuplicates: true }) → ON CONFLICT DO NOTHING
//   - Requires the UNIQUE INDEX from migration 040 step 3
//     (idx_cached_questions_text_hash_exam). Applied 2026-06-09.
//
// PROVENANCE — WARNING from migration 040 PYQ-loss incident (2026-06-09):
//   - Always writes verification_status = 'admin-verified' on every row.
//   - If a future dedup cleanup runs with a priority CASE on
//     verification_status, 'admin-verified' MUST be added to that CASE
//     OR ranked above 'v3-verified-rag' etc. — otherwise admin-imported
//     rows could be silently dropped in a multi-source duplicate group.
//   - imported_by_email + imported_at stored INSIDE question_data for
//     audit trail. Source label collisions across admins are OK because
//     the email field disambiguates.
//
// SCHEMA SYNC:
//   - The Zod schemas below MUST stay in lock-step with
//     packages/shared/src/lib/questionSchema.ts. Edge functions cannot
//     import from the workspace package, so they're duplicated here.
//     When the source schema changes, this file changes too.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders } from '../_shared/cors.ts';
import { isAdminEmail } from '../_shared/admin-allowlist.ts';
import { questionTextHash } from '../_shared/hash.ts';

// ============================================================
// SCHEMAS (Zod) — sync with packages/shared/src/lib/questionSchema.ts
// ============================================================

const FSM_TAG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CONCEPT_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const OptionSchema = z
  .object({
    text: z.string().min(1, 'option text must be non-empty'),
  })
  .strict();

const TARSchema = z
  .object({
    exists: z.boolean(),
    preconditions: z.string().optional(),
    steps: z.array(z.string()),
    sanityCheck: z.string().optional(),
  })
  .strict();

const DEEPSchema = z
  .object({
    steps: z.array(z.string()).min(1, 'fullStepByStep.steps must have at least one entry'),
  })
  .strict();

const TimeTargetsSchema = z
  .object({
    ap_eapcet: z.number().int().positive(),
    ts_eapcet: z.number().int().positive(),
    jee_main: z.number().int().positive(),
  })
  .strict();

// CLOSED BETA: SVG REJECTED at validation. Only 'none' and 'smiles'
// accepted. Re-enable SVG when the render-side sanitizer lands
// (forlater #47, PR #2c).
const VisualSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }).strict(),
  z
    .object({
      type: z.literal('smiles'),
      smiles: z.string().min(1).max(500),
    })
    .strict(),
]);

const QuestionSchema = z
  .object({
    questionText: z.string().min(1, 'questionText must be non-empty'),
    options: z.array(OptionSchema).length(4, 'options must contain exactly 4 items'),
    correctOptionIndex: z.number().int().min(0).max(3),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    fsmTag: z.string().regex(FSM_TAG_REGEX, 'fsmTag must be lowercase kebab-case'),
    subtopic: z.string().min(1, 'subtopic must be non-empty'),
    concepts: z
      .array(z.string().regex(CONCEPT_REGEX, 'each concept must be lowercase kebab-case'))
      .min(1)
      .max(3),
    sourcePages: z.array(z.number().int().positive()).min(1),
    timeTargets: TimeTargetsSchema,
    theOptimalPath: TARSchema,
    fullStepByStep: DEEPSchema,
    visual: VisualSchema,
  })
  .strict();

const ExamProfilesSchema = z
  .object({
    ap_eapcet: z.boolean(),
    ts_eapcet: z.boolean(),
    // Feature gate: jee_main ingest not supported in closed beta.
    jee_main: z.boolean().refine((v) => v === false, {
      message: 'jee_main ingest not supported in closed beta',
    }),
  })
  .strict();

const BatchTagsSchema = z
  .object({
    subject: z.enum(['Mathematics', 'Physics', 'Chemistry']),
    className: z.enum(['Class 11', 'Class 12', '1st Year', '2nd Year']),
    board: z.enum(['BIEAP', 'TSBIE', 'NCERT']),
    chapter: z.string().min(1).max(200),
    examProfiles: ExamProfilesSchema,
    sourceLabel: z.string().min(1).max(200),
  })
  .strict();

const RequestSchema = z
  .object({
    batchTags: BatchTagsSchema,
    questions: z.array(QuestionSchema).min(1).max(100),
  })
  .strict();

type RequestBody = z.infer<typeof RequestSchema>;
type ExamProfileKey = 'ap_eapcet' | 'ts_eapcet';

// ============================================================
// HELPERS
// ============================================================

const MAX_BODY_BYTES = 8_000_000; // 8MB

interface InsertRow {
  question_id: string;
  exam_profile: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  fsm_tag: string | null;
  source: string;
  verification_status: string;
  created_by: string;
  question_text_hash: string;
  question_data: Record<string, unknown>;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(
  status: number,
  error: string,
  code: string,
  detail?: unknown,
): Response {
  const body: Record<string, unknown> = { error, code };
  if (detail !== undefined) body.detail = detail;
  return jsonResponse(status, body);
}

function selectedExamProfiles(
  flags: RequestBody['batchTags']['examProfiles'],
): ExamProfileKey[] {
  const out: ExamProfileKey[] = [];
  if (flags.ap_eapcet) out.push('ap_eapcet');
  if (flags.ts_eapcet) out.push('ts_eapcet');
  // jee_main intentionally excluded — validation rejects true above.
  return out;
}

function buildInsertRow(args: {
  question: z.infer<typeof QuestionSchema>;
  examProfile: ExamProfileKey;
  hash: string;
  batchTags: RequestBody['batchTags'];
  importedByEmail: string;
  createdBy: string;
  importedAt: string;
}): InsertRow {
  const { question: q, examProfile, hash, batchTags, importedByEmail, createdBy, importedAt } =
    args;
  return {
    question_id: `bulk-${crypto.randomUUID()}`,
    exam_profile: examProfile,
    subject: batchTags.subject,
    topic: batchTags.chapter,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    fsm_tag: q.fsmTag,
    source: batchTags.sourceLabel,
    verification_status: 'admin-verified',
    created_by: createdBy,
    question_text_hash: hash,
    question_data: {
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      difficulty: q.difficulty,
      fsmTag: q.fsmTag,
      subtopic: q.subtopic,
      concepts: q.concepts,
      sourcePages: q.sourcePages,
      timeTargets: q.timeTargets,
      theOptimalPath: q.theOptimalPath,
      fullStepByStep: q.fullStepByStep,
      visual: q.visual,
      // Batch-level provenance (carried into question_data so each row
      // stands alone for analytics / export without batch reconstruction)
      board: batchTags.board,
      className: batchTags.className,
      imported_by_email: importedByEmail,
      imported_at: importedAt,
    },
  };
}

// ============================================================
// HANDLER
// ============================================================

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Method check
  if (req.method !== 'POST') {
    return jsonError(405, 'Only POST is supported', 'METHOD_NOT_ALLOWED');
  }

  try {
    // 3. Content-Length guard
    const contentLengthHeader = req.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
        return jsonError(413, 'Payload too large (8MB limit)', 'PAYLOAD_TOO_LARGE');
      }
    }

    // 4. Extract Bearer token
    const authHeader =
      req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError(401, 'Missing or malformed Authorization header', 'NO_AUTH');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return jsonError(401, 'Empty Bearer token', 'NO_AUTH');
    }

    // 5. Verify JWT + resolve email via Supabase Auth (GoTrue)
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData?.user?.email) {
      console.error('[admin-bulk-import] token verification failed:', userErr?.message);
      return jsonError(401, 'Invalid or expired session', 'INVALID_TOKEN');
    }
    const callerEmail = userData.user.email;
    const callerId = userData.user.id;

    // 6. Admin allowlist check
    if (!isAdminEmail(callerEmail)) {
      console.warn('[admin-bulk-import] non-admin attempt by:', callerEmail);
      return jsonError(401, 'Not authorized for admin import', 'NOT_ADMIN');
    }

    // 7. Parse JSON body
    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      return jsonError(
        400,
        'Request body is not valid JSON',
        'BAD_JSON',
        e instanceof Error ? e.message : String(e),
      );
    }

    // 8. Zod validation
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[admin-bulk-import] validation failed:', parsed.error.issues);
      return jsonError(
        400,
        'Request body failed schema validation',
        'VALIDATION_FAIL',
        parsed.error.issues,
      );
    }

    // 9. Derive selected exam profiles
    const profiles = selectedExamProfiles(parsed.data.batchTags.examProfiles);
    if (profiles.length === 0) {
      return jsonError(400, 'At least one exam profile must be selected', 'NO_EXAM_PROFILES');
    }

    // 10. Build insert rows (1 question × N profiles = N rows)
    const importedAt = new Date().toISOString();
    const rows: InsertRow[] = [];

    for (const q of parsed.data.questions) {
      const hash = await questionTextHash(q.questionText);
      for (const ep of profiles) {
        rows.push(
          buildInsertRow({
            question: q,
            examProfile: ep,
            hash,
            batchTags: parsed.data.batchTags,
            importedByEmail: callerEmail,
            createdBy: callerId,
            importedAt,
          }),
        );
      }
    }

    const totalAttempted = rows.length;
    console.log(
      '[admin-bulk-import] request from',
      callerEmail,
      'questions=',
      parsed.data.questions.length,
      'profiles=',
      profiles.length,
      'total_rows=',
      totalAttempted,
      'source=',
      parsed.data.batchTags.sourceLabel,
    );

    // 11. Bulk upsert with ignoreDuplicates (= ON CONFLICT DO NOTHING).
    //     Requires the UNIQUE INDEX from migration 040 step 3.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from('cached_questions')
      .upsert(rows, {
        onConflict: 'question_text_hash,exam_profile',
        ignoreDuplicates: true,
      })
      .select('id, question_text_hash, exam_profile');

    if (insertError) {
      console.error('[admin-bulk-import] insert failed:', insertError);
      return jsonError(500, 'Database insert failed', 'INSERT_FAIL', insertError.message);
    }

    // 12. Per-row provenance: which (hash, exam_profile) pairs were
    //     inserted vs skipped as duplicate.
    const insertedSet = new Set(
      (insertedRows ?? []).map((r) => `${r.question_text_hash}:${r.exam_profile}`),
    );
    const perRow = rows.map((row, idx) => ({
      questionIndex: Math.floor(idx / profiles.length),
      examProfile: row.exam_profile,
      hash: row.question_text_hash,
      status: insertedSet.has(`${row.question_text_hash}:${row.exam_profile}`)
        ? ('inserted' as const)
        : ('duplicate' as const),
    }));

    const inserted = insertedRows?.length ?? 0;
    const duplicates = totalAttempted - inserted;

    console.log(
      '[admin-bulk-import] done — inserted=',
      inserted,
      'duplicates=',
      duplicates,
      'source=',
      parsed.data.batchTags.sourceLabel,
    );

    // 13. Success response
    return jsonResponse(200, {
      inserted,
      duplicates,
      total: totalAttempted,
      sourceLabel: parsed.data.batchTags.sourceLabel,
      perRow,
    });
  } catch (err) {
    console.error('[admin-bulk-import] uncaught:', err);
    return jsonError(
      500,
      'Internal server error',
      'UNCAUGHT',
      err instanceof Error ? err.message : String(err),
    );
  }
});
