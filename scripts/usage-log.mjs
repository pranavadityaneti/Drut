// OpenAI API usage + cost ledger — shared by every script that calls OpenAI.
// Each API call appends ONE line to scripts/.openai-usage.jsonl (the live ledger);
// render a human report with: node scripts/render-usage-report.mjs
//   -> docs/openai-usage-ledger.html
//
// Token counts are EXACT (from the API usage object). The dollar figure is
// tokens × the rates below — an ESTIMATE. The authoritative billed total is the
// OpenAI dashboard: https://platform.openai.com/usage  (this ledger gives the
// per-script / per-paper / per-operation breakdown the dashboard does not).
//
// Reasoning tokens are billed at the OUTPUT rate and are ALREADY included in
// output_tokens, so cost = input×in + output×out (reasoning is tracked for info
// only, never added again — no double counting).
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '.openai-usage.jsonl');

// USD per 1,000,000 tokens. Mirrors scripts/calibrate-format.mjs PRICES.
export const PRICING = {
  'gpt-5.4-mini': { in: 0.75, out: 4.50 },
  'gpt-5.4': { in: 2.50, out: 15.0 },
  'gpt-5.5': { in: 5.0, out: 30.0 },
  'text-embedding-3-small': { in: 0.02, out: 0.0 },
  'text-embedding-3-large': { in: 0.13, out: 0.0 },
};

export function costOf(model, input = 0, output = 0) {
  const p = PRICING[model] || { in: 0, out: 0 };
  return (input * p.in + output * p.out) / 1e6;
}

// Append one usage record. NEVER throws — cost logging must not break a run.
export function recordUsage({ script, model, op = '', input = 0, output = 0, reasoning = 0, meta = {} }) {
  try {
    if (!model || (!input && !output)) return; // skip empty/failed calls
    const cost = +costOf(model, input, output).toFixed(6);
    const line = JSON.stringify({ ts: new Date().toISOString(), script, model, op, input, output, reasoning, cost, meta });
    appendFileSync(LEDGER, line + '\n');
  } catch { /* swallow — logging is best-effort */ }
}
