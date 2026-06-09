import React, { useState, useCallback, useMemo } from 'react';
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Copy,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { BulkImportPayloadSchema, type BulkImportQuestion } from '@drut/shared';
import type { ZodIssue } from 'zod';

/**
 * BulkImport — admin tab for previewing Claude.ai-generated question batches.
 *
 * Scope (PR #2b of the Bulk Import roadmap):
 *   - Drop zone + click-to-upload (.json only)
 *   - Schema validation via @drut/shared BulkImportPayloadSchema
 *   - Read-only preview of first 10 questions on success
 *   - Error list + Copy-errors button on schema violation (whole-batch reject)
 *   - NO database writes. NO batch tagging form. NO confirm button.
 *   - NO visual rendering (svg / smiles) — PR #2c folds in QuestionVisual
 *     per forlater #47.
 *
 * Follow-up PRs:
 *   PR #2c — QuestionVisual renderer (RDKit-JS + sanitized SVG)
 *   PR #3  — batch tagging form (source label, exam profile, subject, class, board)
 *   PR #4  — dedup + insert via edge function
 *   PR #5  — RLS hardening (post-beta)
 */

interface ParseError {
  row: number | null;
  path: string;
  message: string;
}

type ParseResult =
  | { status: 'idle' }
  | { status: 'parsing'; fileName: string }
  | { status: 'success'; fileName: string; questions: BulkImportQuestion[] }
  | { status: 'error'; fileName: string; errors: ParseError[] };

// =====================================================================
// Batch tagging — metadata that goes onto every row in a batch.
// Source label is auto-derived from the other fields + today's date but
// can be overridden with a manual edit.
// =====================================================================

type BatchSubject = 'Mathematics' | 'Physics' | 'Chemistry';
type BatchClass = 'Class 11' | 'Class 12' | '1st Year' | '2nd Year';
type BatchBoard = 'BIEAP' | 'TSBIE' | 'NCERT';

const SUBJECT_OPTIONS: BatchSubject[] = ['Mathematics', 'Physics', 'Chemistry'];
const CLASS_OPTIONS: BatchClass[] = ['Class 11', 'Class 12', '1st Year', '2nd Year'];
const BOARD_OPTIONS: BatchBoard[] = ['BIEAP', 'TSBIE', 'NCERT'];

interface BatchTags {
  subject: BatchSubject | '';
  className: BatchClass | '';
  board: BatchBoard | '';
  chapter: string; // free-form (e.g. "ch1" or "Chapter 1: Functions")
  examProfiles: {
    ap_eapcet: boolean;
    ts_eapcet: boolean;
    jee_main: boolean;
  };
  // null = use auto-derived; string = manual override (admin clicked Edit)
  sourceLabelOverride: string | null;
}

const DEFAULT_TAGS: BatchTags = {
  subject: '',
  className: '',
  board: '',
  chapter: '',
  examProfiles: { ap_eapcet: true, ts_eapcet: true, jee_main: false },
  sourceLabelOverride: null,
};

function computeSourceLabel(tags: BatchTags, today: string): string {
  const board = tags.board || 'BOARD';
  const className = tags.className ? tags.className.replace(/\s/g, '') : 'CLASS';
  const subject = tags.subject || 'SUBJECT';
  const chapter = tags.chapter.trim() || 'batch';
  return `claude-chat-${today}-${board}-${className}-${subject}-${chapter}`;
}

function isTagsComplete(tags: BatchTags): boolean {
  if (!tags.subject || !tags.className || !tags.board || !tags.chapter.trim()) {
    return false;
  }
  const hasExamProfile =
    tags.examProfiles.ap_eapcet ||
    tags.examProfiles.ts_eapcet ||
    tags.examProfiles.jee_main;
  return hasExamProfile;
}

function zodIssuesToParseErrors(issues: ZodIssue[]): ParseError[] {
  return issues.map((issue) => {
    const [first, ...rest] = issue.path;
    const isRowIndex = typeof first === 'number';
    return {
      row: isRowIndex ? first : null,
      path: rest.length > 0 ? rest.join('.') : '<root>',
      message: issue.message,
    };
  });
}

function formatErrorsForCopy(errors: ParseError[]): string {
  return errors
    .map((e) =>
      e.row !== null
        ? `Row ${e.row + 1} (${e.path}): ${e.message}`
        : `Top-level (${e.path}): ${e.message}`
    )
    .join('\n');
}

export const BulkImport: React.FC = () => {
  const [result, setResult] = useState<ParseResult>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [batchTags, setBatchTags] = useState<BatchTags>(DEFAULT_TAGS);
  const [isEditingSourceLabel, setIsEditingSourceLabel] = useState(false);

  // Today's date in YYYY-MM-DD — computed once per mount so the source
  // label doesn't churn while the admin is filling the form.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const autoSourceLabel = computeSourceLabel(batchTags, today);
  const sourceLabel = batchTags.sourceLabelOverride ?? autoSourceLabel;
  const tagsComplete = isTagsComplete(batchTags);

  const handleFile = useCallback(async (file: File) => {
    setResult({ status: 'parsing', fileName: file.name });

    let text: string;
    try {
      text = await file.text();
    } catch (e) {
      setResult({
        status: 'error',
        fileName: file.name,
        errors: [
          {
            row: null,
            path: '<file>',
            message: `Failed to read file: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
      });
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setResult({
        status: 'error',
        fileName: file.name,
        errors: [
          {
            row: null,
            path: '<root>',
            message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
      });
      return;
    }

    const parse = BulkImportPayloadSchema.safeParse(json);
    if (!parse.success) {
      setResult({
        status: 'error',
        fileName: file.name,
        errors: zodIssuesToParseErrors(parse.error.issues),
      });
      return;
    }

    setResult({ status: 'success', fileName: file.name, questions: parse.data });
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so re-selecting the same file fires onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCopyErrors = async () => {
    if (result.status !== 'error') return;
    try {
      await navigator.clipboard.writeText(formatErrorsForCopy(result.errors));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some contexts; silent fallback
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)]">
          Bulk Import Questions
        </h2>
        <p className="text-[14px] text-[var(--color-ink-3)] mt-1">
          Drop a Claude.ai-generated JSON batch to validate. No database writes from this screen yet — tagging + insert ship in follow-up PRs.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-paper-2)]'
            : 'border-[var(--color-line)] hover:border-[var(--color-ink-3)]'
        }`}
      >
        <Upload className="h-12 w-12 mx-auto text-[var(--color-ink-3)] mb-4" />
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleInput}
            className="hidden"
          />
          <span className="text-[14px] text-[var(--color-ink-2)]">
            Drop JSON file here or{' '}
            <span className="text-[var(--color-accent)] underline">click to upload</span>
          </span>
        </label>
        {result.status !== 'idle' && (
          <p className="text-[12px] text-[var(--color-ink-3)] mt-3 font-mono">
            {result.fileName}
          </p>
        )}
      </div>

      {/* Parsing */}
      {result.status === 'parsing' && (
        <p className="text-[14px] text-[var(--color-ink-3)]">Parsing…</p>
      )}

      {/* Success: preview */}
      {result.status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[14px] text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {result.questions.length} question{result.questions.length === 1 ? '' : 's'} parsed
              successfully. Showing first 10.
            </span>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-paper-2)]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">#</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
                    Question
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
                    Subtopic
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
                    Difficulty
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
                    fsmTag
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
                    Valid
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.questions.slice(0, 10).map((q, i) => (
                  <tr key={i} className="border-t border-[var(--color-line)]">
                    <td className="px-3 py-2 text-[var(--color-ink-3)]">{i + 1}</td>
                    <td className="px-3 py-2 text-[var(--color-ink-1)]">
                      {q.questionText.slice(0, 80)}
                      {q.questionText.length > 80 ? '…' : ''}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-ink-2)]">{q.subtopic}</td>
                    <td className="px-3 py-2 text-[var(--color-ink-2)]">{q.difficulty}</td>
                    <td className="px-3 py-2 text-[var(--color-ink-2)] font-mono text-[12px]">
                      {q.fsmTag}
                    </td>
                    <td className="px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.questions.length > 10 && (
            <p className="text-[12px] text-[var(--color-ink-3)]">
              … and {result.questions.length - 10} more.
            </p>
          )}

          {/* Batch tagging form */}
          <div className="mt-8 border border-[var(--color-line)] rounded-lg p-6 space-y-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-ink-1)]">
                Batch tagging
              </h3>
              <span className="text-[12px] text-[var(--color-ink-3)]">
                required before upload
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject */}
              <label className="space-y-1.5">
                <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                  Subject
                </span>
                <select
                  value={batchTags.subject}
                  onChange={(e) =>
                    setBatchTags({ ...batchTags, subject: e.target.value as BatchSubject | '' })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-line)] rounded text-[14px] bg-white text-[var(--color-ink-1)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">— select —</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              {/* Class */}
              <label className="space-y-1.5">
                <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                  Class
                </span>
                <select
                  value={batchTags.className}
                  onChange={(e) =>
                    setBatchTags({ ...batchTags, className: e.target.value as BatchClass | '' })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-line)] rounded text-[14px] bg-white text-[var(--color-ink-1)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">— select —</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {/* Board */}
              <label className="space-y-1.5">
                <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                  Board
                </span>
                <select
                  value={batchTags.board}
                  onChange={(e) =>
                    setBatchTags({ ...batchTags, board: e.target.value as BatchBoard | '' })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-line)] rounded text-[14px] bg-white text-[var(--color-ink-1)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">— select —</option>
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              {/* Chapter */}
              <label className="space-y-1.5">
                <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                  Chapter
                </span>
                <input
                  type="text"
                  value={batchTags.chapter}
                  onChange={(e) => setBatchTags({ ...batchTags, chapter: e.target.value })}
                  placeholder='e.g. "ch1" or "Chapter 1: Functions"'
                  className="w-full px-3 py-2 border border-[var(--color-line)] rounded text-[14px] bg-white text-[var(--color-ink-1)] placeholder-[var(--color-ink-3)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </label>
            </div>

            {/* Target exams */}
            <div className="space-y-1.5">
              <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                Target exams
              </span>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    { key: 'ap_eapcet', label: 'AP EAPCET' },
                    { key: 'ts_eapcet', label: 'TG EAPCET' },
                    { key: 'jee_main', label: 'JEE Main' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchTags.examProfiles[key]}
                      onChange={(e) =>
                        setBatchTags({
                          ...batchTags,
                          examProfiles: {
                            ...batchTags.examProfiles,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 border-[var(--color-line)] rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <span className="text-[14px] text-[var(--color-ink-1)]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verification status (read-only) */}
            <div className="space-y-1.5">
              <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                Verification status
              </span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded text-[13px]">
                <code className="font-mono text-[var(--color-ink-1)]">manual-curated</code>
                <span className="text-[12px] text-[var(--color-ink-3)]">forced for this flow</span>
              </div>
            </div>

            {/* Source label */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="block text-[12px] text-[var(--color-ink-2)] font-medium">
                  Source label
                </span>
                {!isEditingSourceLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSourceLabel(true);
                      setBatchTags({ ...batchTags, sourceLabelOverride: sourceLabel });
                    }}
                    className="flex items-center gap-1 text-[12px] text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSourceLabel(false);
                      setBatchTags({ ...batchTags, sourceLabelOverride: null });
                    }}
                    className="flex items-center gap-1 text-[12px] text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to auto
                  </button>
                )}
              </div>
              {!isEditingSourceLabel ? (
                <code className="block px-3 py-2 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded text-[13px] font-mono text-[var(--color-ink-1)] break-all">
                  {sourceLabel}
                </code>
              ) : (
                <input
                  type="text"
                  value={batchTags.sourceLabelOverride ?? ''}
                  onChange={(e) =>
                    setBatchTags({ ...batchTags, sourceLabelOverride: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-line)] rounded text-[13px] font-mono bg-white text-[var(--color-ink-1)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              )}
            </div>

            {/* Confirm — disabled pending PR #4 */}
            <div className="pt-2 border-t border-[var(--color-line)] flex items-center justify-between">
              <p className="text-[12px] text-[var(--color-ink-3)]">
                {tagsComplete
                  ? `Ready to upload ${result.questions.length} questions — confirm path lands in PR #4.`
                  : 'Complete all required fields above to enable upload.'}
              </p>
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-[var(--color-ink-3)] text-white rounded text-[14px] font-medium opacity-50 cursor-not-allowed"
                title="Insert path ships in PR #4"
              >
                Confirm upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error list */}
      {result.status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[14px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Batch rejected — {result.errors.length} error
                {result.errors.length === 1 ? '' : 's'}. Fix in Claude.ai and re-export.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyErrors}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-line)] rounded text-[13px] hover:bg-[var(--color-paper-2)] transition-colors shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy errors'}
            </button>
          </div>
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <ul className="space-y-1 text-[13px] text-red-900 font-mono">
              {result.errors.map((err, i) => (
                <li key={i}>
                  {err.row !== null ? `Row ${err.row + 1}` : 'Top-level'} ({err.path}):{' '}
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
