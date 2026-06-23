#!/usr/bin/env node
/**
 * Re-embed all textbook_chunks with OpenAI embeddings (replacing the old
 * Gemini gemini-embedding-001 vectors, whose key was leaked/blocked).
 *
 * WHY: RAG compares a query embedding against stored chunk embeddings; they
 * MUST be in the same model's vector space. To go OpenAI-only we re-embed every
 * chunk with OpenAI text-embedding-3-small at dimensions=768 (keeps the existing
 * pgvector vector(768) column — no schema change). The generator + ingestion
 * must then also embed queries/new-chunks with the same model.
 *
 * SAFETY:
 *  - LIMIT env caps how many chunks to process (test small first). Default: all.
 *  - Updates via PostgREST upsert {id, textbook_id, content, embedding} so only
 *    those columns change; page_number/chunk_index/metadata are preserved.
 *  - Idempotent: safe to re-run.
 *  - Keys never printed. OPENAI from scripts/.env.calibration; SUPABASE from
 *    apps/web/.env.local.
 *
 * Run (test 4):  LIMIT=4 node scripts/reembed-chunks.mjs
 * Run (all):     node scripts/reembed-chunks.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const EMBED_MODEL = 'text-embedding-3-small';
const DIMS = 768;
const FETCH_PAGE = 200;     // rows fetched per page
const EMBED_BATCH = 64;     // chunks per OpenAI embeddings request
const UPSERT_BATCH = 50;    // rows per PostgREST upsert
const LIMIT = parseInt(process.env.LIMIT || '0', 10); // 0 = all

function envFromFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const webEnv = envFromFile(join(ROOT, 'apps/web/.env.local'));
const calEnv = envFromFile(join(__dirname, '.env.calibration'));
const OPENAI_API_KEY = calEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = webEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = webEnv.SUPABASE_SERVICE_ROLE_KEY || '';

async function embedBatch(texts, attempt = 1) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts.map(t => String(t || '').slice(0, 8000) || ' '), dimensions: DIMS }),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 200);
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return embedBatch(texts, attempt + 1);
    }
    throw new Error(`OpenAI embeddings ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

async function fetchChunkPage(offset, pageSize) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/textbook_chunks?select=id,textbook_id,content&order=id.asc&offset=${offset}&limit=${pageSize}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`fetch chunks ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

async function upsertRows(rows, attempt = 1) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/textbook_chunks?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 250);
    if (res.status >= 500 && attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return upsertRows(rows, attempt + 1); }
    throw new Error(`upsert ${res.status}: ${err}`);
  }
}

function toVectorLiteral(arr) { return '[' + arr.join(',') + ']'; }

async function main() {
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SERVICE_KEY) { console.error('Missing OPENAI or SUPABASE creds'); process.exit(1); }
  console.log(`Re-embedding textbook_chunks with OpenAI ${EMBED_MODEL} @ ${DIMS}-dim` + (LIMIT ? ` (LIMIT ${LIMIT})` : ' (ALL)'));

  let processed = 0, offset = 0, done = false;
  while (!done) {
    const want = LIMIT ? Math.min(FETCH_PAGE, LIMIT - processed) : FETCH_PAGE;
    if (want <= 0) break;
    const page = await fetchChunkPage(offset, want);
    if (!page.length) break;
    offset += page.length;

    // embed in sub-batches
    const embeddings = [];
    for (let i = 0; i < page.length; i += EMBED_BATCH) {
      const sub = page.slice(i, i + EMBED_BATCH);
      const vecs = await embedBatch(sub.map(c => c.content));
      embeddings.push(...vecs);
    }
    // upsert in batches
    const rows = page.map((c, i) => ({ id: c.id, textbook_id: c.textbook_id, content: c.content, embedding: toVectorLiteral(embeddings[i]) }));
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      await upsertRows(rows.slice(i, i + UPSERT_BATCH));
    }
    processed += page.length;
    console.log(`  processed ${processed} chunks...`);
    if (page.length < want) done = true;
    if (LIMIT && processed >= LIMIT) done = true;
  }
  console.log(`Done. Re-embedded ${processed} chunks with OpenAI ${EMBED_MODEL}@${DIMS}.`);
}

main();
