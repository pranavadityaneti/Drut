#!/usr/bin/env node
/**
 * PYQ PDF extractor (vision) — v2.
 *
 * AP EAPCET answer papers are text-based but render math as visual glyphs, are
 * BILINGUAL (English + Telugu), and mark the correct option with a green ✔ — so
 * extraction needs a VISION model.
 *
 * v2 fixes the page-continuity problems found in the v1 test:
 *  - OVERLAPPING 2-page windows: each window = pages (p, p+1), so a question split
 *    across a page break is whole in some window. "Question Number" header precedes
 *    its question. Dedup is by CONTENT hash (not the printed number, which can be
 *    mis-read at a boundary).
 *  - BILINGUAL capture: keeps BOTH English and the OFFICIAL Telugu (parked for a
 *    future Telugu mode — free now, authoritative wording, lossy to re-translate).
 *
 * Output: scripts/extract-pyq-output.json
 * Run: PDF="<path>" FIRST=2 LAST=20 MODEL=gpt-5.4-mini node scripts/extract-pyq-pdf.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { recordUsage } from './usage-log.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const calEnv = (() => { const o = {}; const p = join(ROOT, 'scripts/.env.calibration'); if (!existsSync(p)) return o; for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); } return o; })();
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

const CONFIG = {
  pdf: process.env.PDF || '',
  firstPage: parseInt(process.env.FIRST || '2', 10),
  lastPage: parseInt(process.env.LAST || '20', 10),
  model: process.env.MODEL || 'gpt-5.4-mini',
  dpi: parseInt(process.env.DPI || '150', 10),
  paperLabel: process.env.PAPER || 'AP EAPCET Engineering',
};

const SYSTEM = `You transcribe multiple-choice questions from TWO consecutive page images of an AP EAPCET (Engineering entrance) answer paper. A single question may be split across the two pages — use both images to reconstruct complete questions.

Each "Question Number : N" header PRECEDES the question it labels — associate each stem with the header ABOVE it (never the header below it).

The page is BILINGUAL: every question and option is printed in English first, then Telugu. Capture BOTH languages into separate fields. The correct option is marked with a GREEN check (✔); wrong options have a RED cross (✖) — use that for correctOptionIndex (0-based).

ALL mathematics MUST be valid LaTeX inline as $...$ (e.g. $f(x)=\\cos x-3$, $\\frac{n^2(n+1)^2}{4}$, $\\mathbb{R}\\setminus\\{0\\}$, $\\begin{bmatrix}1&-1\\\\2&3\\end{bmatrix}$). Math is language-neutral: the Telugu fields contain Telugu words with the SAME LaTeX. Never output raw unicode math glyphs.

Return ONLY a JSON array (no prose, no fences), one object per question whose STEM and ALL FOUR options are fully visible across the two pages (skip any still cut off — it will be captured by an adjacent window):
[{
  "questionNumber": number,
  "subject": "Mathematics"|"Physics"|"Chemistry",
  "questionText": string,          // English, LaTeX math
  "questionTextTe": string,        // Telugu, same LaTeX
  "options": [
    {"en": string, "te": string}, {"en": string, "te": string},
    {"en": string, "te": string}, {"en": string, "te": string}
  ],
  "correctOptionIndex": 0-3,       // the green ✔
  "hasDiagram": boolean,           // true if it depends on a figure/diagram
  "confidence": "high"|"medium"|"low"
}]
If no complete question spans the two pages, return [].`;

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  if (Array.isArray(data.output)) { const p = []; for (const it of data.output) if (Array.isArray(it.content)) for (const c of it.content) if (typeof c.text === 'string') p.push(c.text); if (p.length) return p.join(''); }
  return '';
}
function parseJsonLoose(t) {
  let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}
const contentHash = (q) => createHash('sha256').update(String(q.questionText || '').toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex');
const CONF_RANK = { high: 3, medium: 2, low: 1 };

async function extractWindow(b64a, b64b, attempt = 1) {
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.model,
        instructions: SYSTEM,
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'These are two consecutive pages. Transcribe every question whose stem and all 4 options are fully visible across them, as the JSON array.' },
          { type: 'input_image', image_url: `data:image/png;base64,${b64a}` },
          { type: 'input_image', image_url: `data:image/png;base64,${b64b}` },
        ] }],
        reasoning: { effort: 'low' },
      }),
    });
    const data = await res.json();
    if (!res.ok) { if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return extractWindow(b64a, b64b, attempt + 1); } return { error: data.error?.message || `HTTP ${res.status}` }; }
    const arr = parseJsonLoose(extractText(data));
    const u = data.usage || {};
    return { questions: Array.isArray(arr) ? arr : [], usage: { in: u.input_tokens ?? 0, out: u.output_tokens ?? 0 } };
  } catch (e) { if (attempt < 2) { await new Promise(r => setTimeout(r, 1500)); return extractWindow(b64a, b64b, attempt + 1); } return { error: String(e) }; }
}

function valid(q) {
  return q && q.questionText && Array.isArray(q.options) && q.options.length === 4
    && Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3;
}

(async () => {
  if (!OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY (scripts/.env.calibration)'); process.exit(1); }
  if (!CONFIG.pdf || !existsSync(CONFIG.pdf)) { console.error('Set PDF=<path>'); process.exit(1); }

  const pagesDir = join(ROOT, 'scripts', '.pyq-pages');
  rmSync(pagesDir, { recursive: true, force: true }); mkdirSync(pagesDir, { recursive: true });
  console.log(`\nPYQ extraction v2 — ${CONFIG.model} @ vision (2-page windows, bilingual)`);
  console.log(`PDF: ${CONFIG.pdf.split('/').pop()}  pages ${CONFIG.firstPage}-${CONFIG.lastPage} @ ${CONFIG.dpi}dpi\n`);

  execFileSync('pdftoppm', ['-png', '-r', String(CONFIG.dpi), '-f', String(CONFIG.firstPage), '-l', String(CONFIG.lastPage), CONFIG.pdf, join(pagesDir, 'page')]);
  const pngs = readdirSync(pagesDir).filter(f => f.endsWith('.png')).sort();
  const imgs = pngs.map(f => readFileSync(join(pagesDir, f)).toString('base64'));
  console.log(`Rendered ${pngs.length} pages -> ${Math.max(0, pngs.length - 1)} overlapping windows\n`);

  const outPath = join(ROOT, 'scripts', process.env.OUT || 'extract-pyq-output.json');
  const byHash = new Map();
  let startWindow = 0, totIn = 0, totOut = 0;
  // Resume from a prior partial run (checkpoint written per-window) — survives kills.
  if (process.env.RESUME !== 'false' && existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev?.config?.pdf === CONFIG.pdf && prev.config.firstPage === CONFIG.firstPage && prev.config.lastPage === CONFIG.lastPage && Number.isInteger(prev.lastWindow)) {
        for (const q of (prev.questions || [])) byHash.set(contentHash(q), q);
        startWindow = prev.lastWindow + 1;
        console.log(`Resuming: ${byHash.size} questions kept, continuing from window ${startWindow}.\n`);
      }
    } catch { /* corrupt checkpoint -> start fresh */ }
  }
  const flush = (lastWindow) => {
    const qs = [...byHash.values()].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    writeFileSync(outPath, JSON.stringify({ config: CONFIG, count: qs.length, lastWindow, questions: qs }, null, 2));
  };
  for (let i = startWindow; i < imgs.length - 1; i++) {
    process.stdout.write(`  window ${pngs[i]}+${pngs[i + 1]} ... `);
    const r = await extractWindow(imgs[i], imgs[i + 1]);
    if (r.error) { console.log(`ERROR: ${r.error}`); flush(i); continue; }
    totIn += r.usage.in; totOut += r.usage.out;
    recordUsage({ script: 'extract-pyq', model: CONFIG.model, op: 'extract-window', input: r.usage.in, output: r.usage.out, meta: { paper: CONFIG.paperLabel, pdf: CONFIG.pdf.split('/').pop() } });
    let added = 0, dupes = 0;
    for (const q of r.questions) {
      if (!valid(q)) continue;
      const h = contentHash(q);
      const prev = byHash.get(h);
      if (!prev) { byHash.set(h, q); added++; }
      else { dupes++; if ((CONF_RANK[q.confidence] || 0) > (CONF_RANK[prev.confidence] || 0)) byHash.set(h, q); }
    }
    console.log(`${r.questions.length} found (${added} new, ${dupes} dup) [out ${r.usage.out}]`);
    flush(i);  // checkpoint after every window
    await new Promise(rr => setTimeout(rr, 350));
  }

  const questions = [...byHash.values()].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  const out = { config: CONFIG, count: questions.length, questions };
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  const bySubj = {}; let withDiagram = 0, lowConf = 0;
  questions.forEach(q => { bySubj[q.subject] = (bySubj[q.subject] || 0) + 1; if (q.hasDiagram) withDiagram++; if (q.confidence === 'low') lowConf++; });
  console.log(`\nExtracted ${questions.length} distinct questions. by subject: ${JSON.stringify(bySubj)}`);
  console.log(`  diagram-dependent: ${withDiagram}  ·  low-confidence: ${lowConf}  ·  tokens in ${totIn}/out ${totOut}`);
  console.log(`Output: ${outPath}\n`);
  console.log('Number coverage (gaps = either spanned a window we did not reach, or genuinely absent):');
  const nums = questions.map(q => q.questionNumber).filter(Number.isInteger).sort((a, b) => a - b);
  console.log(`  numbers seen: [${nums.join(', ')}]`);
  console.log('\nBilingual spot-check (first 2):');
  questions.slice(0, 2).forEach(q => {
    console.log(`\n  Q${q.questionNumber} [${q.subject}] key=${'ABCD'[q.correctOptionIndex]}`);
    console.log(`    EN: ${String(q.questionText).slice(0, 110)}`);
    console.log(`    TE: ${String(q.questionTextTe || '(none)').slice(0, 110)}`);
  });
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
