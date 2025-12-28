
import { z } from "zod";

export const QuestionSchema = z.object({
  questionText: z.string(),
  // STRICT: Must have exactly 4 options to match the UI layout
  options: z.array(z.object({ text: z.string() }))
    .length(4, { message: "Options array must contain exactly 4 items." }),
  // STRICT: Index must be valid for the options array
  correctOptionIndex: z.number().int().min(0).max(3),
  timeTargets: z.object({
    jee_main: z.number(),
    cat: z.number(),
    eamcet: z.number()
  }),
  theOptimalPath: z.object({
    exists: z.boolean(),
    preconditions: z.string().optional(),
    steps: z.array(z.string()),
    sanityCheck: z.string().optional()
  }),
  fullStepByStep: z.object({
    steps: z.array(z.string())
  }),
  // FSM Tag: kebab-case pattern identifier for grouping similar problems
  fsmTag: z.string().regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    { message: "fsmTag must be lowercase kebab-case (e.g., 'ratio-inverse-prop')" }
  ),
});

export type QuestionItem = z.infer<typeof QuestionSchema>;
