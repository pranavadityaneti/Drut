// Recursively list + download the Supabase 'textbooks' storage bucket.
// Invoked by scripts/download-textbooks.sh — expects SB_KEY in env and the
// destination directory as argv[2]. Prints file names and sizes only.
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_URL = 'https://ukrtaerwaxekonislnpw.supabase.co';
const BUCKET = 'textbooks';
const KEY = process.env.SB_KEY;
const DEST = process.argv[2];

if (!KEY) { console.error('SB_KEY env var missing'); process.exit(1); }
if (!DEST) { console.error('destination dir argument missing'); process.exit(1); }

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function listFolder(prefix) {
  const res = await fetch(`${PROJECT_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!res.ok) throw new Error(`list "${prefix}" failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function walk(prefix) {
  const entries = await listFolder(prefix);
  const files = [];
  for (const e of entries) {
    const full = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) {
      files.push(...(await walk(full)));   // folder → recurse
    } else {
      files.push({ path: full, size: e.metadata?.size ?? 0 });
    }
  }
  return files;
}

const files = await walk('');
if (files.length === 0) {
  console.log('Bucket is EMPTY — no textbooks found. Tell Claude Code; it will not generate without ground truth.');
  process.exit(0);
}

console.log(`Found ${files.length} file(s):`);
let downloaded = 0;
for (const f of files) {
  const mb = (f.size / 1024 / 1024).toFixed(1);
  const out = path.join(DEST, f.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (fs.existsSync(out) && fs.statSync(out).size === f.size && f.size > 0) {
    console.log(`  skip (exists)  ${f.path}  ${mb} MB`);
    continue;
  }
  const res = await fetch(
    `${PROJECT_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(f.path).replace(/%2F/g, '/')}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!res.ok) {
    console.error(`  FAILED         ${f.path}  (${res.status})`);
    continue;
  }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  downloaded++;
  console.log(`  downloaded     ${f.path}  ${mb} MB`);
}
console.log(`\nDone. ${downloaded} downloaded, ${files.length - downloaded} skipped/failed.`);
console.log(`Files are in: ${DEST}`);
