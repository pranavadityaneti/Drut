/**
 * Strict schema for the JSON payload produced by the Claude.ai
 * question-generation prompt (docs/claude-chat-question-generation-prompt.md).
 *
 * This schema is the validation contract for the admin Bulk Import flow
 * (docs/practice-mode-architecture-v2.md § "Admin Bulk Import — UI shape").
 *
 * NOT the same as `QuestionSchema` in `lib/ai/schema.ts`:
 *   - That schema accepts Gemini output (drifted from the prompt — different
 *     field names, different timeTargets keys, missing concepts/sourcePages).
 *   - Do NOT consolidate. The admin import path is intentionally strict;
 *     the Gemini path is intentionally permissive for legacy compatibility.
 */

import { z } from 'zod';

const FSM_TAG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CONCEPT_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const BulkImportOptionSchema = z
  .object({
    text: z.string().min(1, 'option text must be non-empty'),
  })
  .strict();

const BulkImportTARSchema = z
  .object({
    exists: z.boolean(),
    preconditions: z.string().optional(),
    steps: z.array(z.string()),
    sanityCheck: z.string().optional(),
  })
  .strict();

const BulkImportDEEPSchema = z
  .object({
    steps: z
      .array(z.string())
      .min(1, 'fullStepByStep.steps must have at least one entry'),
  })
  .strict();

const BulkImportTimeTargetsSchema = z
  .object({
    ap_eapcet: z.number().int().positive(),
    ts_eapcet: z.number().int().positive(),
    jee_main: z.number().int().positive(),
  })
  .strict();

export const BulkImportQuestionSchema = z
  .object({
    questionText: z.string().min(1, 'questionText must be non-empty'),
    options: z
      .array(BulkImportOptionSchema)
      .length(4, 'options must contain exactly 4 items'),
    correctOptionIndex: z.number().int().min(0).max(3),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    fsmTag: z
      .string()
      .regex(FSM_TAG_REGEX, 'fsmTag must be lowercase kebab-case'),
    subtopic: z
      .string()
      .min(1, 'subtopic must be non-empty (matches one of the chapter\'s enumerated subtopics)'),
    concepts: z
      .array(
        z
          .string()
          .regex(CONCEPT_REGEX, 'each concept must be lowercase kebab-case')
      )
      .min(1, 'concepts must have at least one entry')
      .max(3, 'concepts must have at most three entries'),
    sourcePages: z
      .array(z.number().int().positive())
      .min(1, 'sourcePages must have at least one entry'),
    timeTargets: BulkImportTimeTargetsSchema,
    theOptimalPath: BulkImportTARSchema,
    fullStepByStep: BulkImportDEEPSchema,
    visualDescription: z.string().nullable(),
  })
  .strict();

export const BulkImportPayloadSchema = z
  .array(BulkImportQuestionSchema)
  .min(1, 'payload must contain at least one question');

export type BulkImportQuestion = z.infer<typeof BulkImportQuestionSchema>;
export type BulkImportPayload = z.infer<typeof BulkImportPayloadSchema>;
