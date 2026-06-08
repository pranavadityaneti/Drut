#!/usr/bin/env python3
"""
cache-warm.py — Pre-warm cached_questions with RAG-grounded MCQ generation.

For each chapter (board × class × subject × chapter) in knowledge_nodes,
calls generate-batch via Supabase Edge Function N times, then bulk-inserts
the returned questions into cached_questions with the right exam_profile.

Why this exists:
- 7,204 textbook chunks ingested but ALLOW_LIVE_AI_FALLBACK=false means
  cache misses can't trigger live generation; students get cache-only.
- Pre-warming the cache with RAG-grounded questions means students hit
  cache (fast) AND get textbook-grounded content.

Usage:
    SUPABASE_PAT=sbp_xxx python3 scripts/cache-warm.py [options]

Options:
    --questions-per-chapter N   Default 30. How many questions to generate per chapter.
    --concurrency N             Default 10. Parallel HTTP requests in flight.
    --dry-run                   Print plan, don't actually call generate-batch or insert.
    --start-from CHAPTER        Resume from a specific chapter name (case-sensitive).
    --board BOARD               Only warm chapters from this board (NCERT/BIEAP/TSBIE).

Checkpointing:
    Progress saved to .cache-warm-checkpoint.json after each chapter completes.
    If the script crashes, re-run with the same args — it skips already-done chapters.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_REF = "ukrtaerwaxekonislnpw"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
DIFFICULTY = "Medium"
SOURCE_TAG = "rag-warm-2026-06-06"
CHECKPOINT_FILE = Path(".cache-warm-checkpoint.json")
GEN_TIMEOUT_SEC = 180  # per generate-batch call
RETRY_ATTEMPTS = 2     # one retry on transient failures

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

PAT = os.environ.get("SUPABASE_PAT")
if not PAT:
    print("ERROR: Set SUPABASE_PAT env var with your Supabase Personal Access Token", file=sys.stderr)
    sys.exit(1)

def fetch_service_role_key() -> str:
    """Use the PAT to fetch the project's service_role API key."""
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/api-keys?reveal=true",
        headers={
            "Authorization": f"Bearer {PAT}",
            "User-Agent": "drut-cache-warm/1.0",
        },
    )
    keys = json.loads(urllib.request.urlopen(req).read())
    for k in keys:
        if k.get("name") == "service_role":
            return k["api_key"]
    raise RuntimeError("service_role key not found")

SVC_KEY: str = ""  # set in main()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def db_query(sql: str) -> Any:
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        MGMT_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {PAT}",
            "Content-Type": "application/json",
            "User-Agent": "drut-cache-warm/1.0",
        },
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req).read())

def get_chapters(board_filter: Optional[str] = None) -> List[Dict[str, str]]:
    """Fetch every (board, class, subject, chapter) combo from knowledge_nodes."""
    where = ""
    if board_filter:
        where = f"AND kn.metadata->>'board' = '{board_filter}'"
    sql = f"""
    SELECT
      kn.id,
      kn.name AS chapter,
      kn.metadata->>'board' AS board,
      kn.metadata->>'class' AS class_level,
      kn.metadata->>'subject' AS subject
    FROM public.knowledge_nodes kn
    WHERE kn.node_type = 'topic'
      AND kn.metadata->>'board' IS NOT NULL
      AND kn.metadata->>'subject' IS NOT NULL
      {where}
    ORDER BY kn.metadata->>'board', kn.metadata->>'class', kn.metadata->>'subject', kn.name;
    """
    return db_query(sql)

def exam_profiles_for(board: str) -> List[str]:
    """NCERT applies to both AP and TS EAPCET; state boards only to their state."""
    if board == "NCERT":
        return ["ap_eapcet", "ts_eapcet"]
    if board == "BIEAP":
        return ["ap_eapcet"]
    if board == "TSBIE":
        return ["ts_eapcet"]
    return ["ap_eapcet"]

def generate_one(chapter: Dict[str, str], exam_profile: str) -> Optional[Dict[str, Any]]:
    """Invoke generate-batch for one question. Returns the parsed JSON or None on failure."""
    body = json.dumps({
        "topic": chapter["chapter"],
        "subtopic": "mixed",
        "examProfile": exam_profile,
        "difficulty": DIFFICULTY,
        "count": 1,
        "classLevel": chapter["class_level"],
        "board": chapter["board"],
        "subject": chapter["subject"],
        "language": "English",
    }).encode()
    last_err = None
    for attempt in range(RETRY_ATTEMPTS + 1):
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/functions/v1/generate-batch",
                data=body,
                headers={
                    "Authorization": f"Bearer {SVC_KEY}",
                    "apikey": SVC_KEY,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            resp = urllib.request.urlopen(req, timeout=GEN_TIMEOUT_SEC)
            return json.loads(resp.read())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = e
            if attempt < RETRY_ATTEMPTS:
                time.sleep(2 ** attempt)
            else:
                return None
    return None

def extract_question(response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Pull the single question out of generate-batch's response, handling shape variation."""
    if not isinstance(response, dict):
        return None
    questions = response.get("questions") or response.get("items") or response.get("data") or []
    if not isinstance(questions, list) or not questions:
        return None
    q = questions[0]
    if not isinstance(q, dict):
        return None
    return q

def jsonb_literal(obj: Any) -> str:
    """Build a SQL-safe JSONB literal."""
    serialized = json.dumps(obj, ensure_ascii=False)
    # PostgreSQL uses '' for escaping single quotes
    escaped = serialized.replace("'", "''")
    return f"'{escaped}'::jsonb"

def sql_literal(s: Optional[str]) -> str:
    """SQL string literal (handles None / quotes)."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def bulk_insert(rows: List[Dict[str, Any]]) -> int:
    """Insert a batch of cached_questions rows. Returns the number inserted."""
    if not rows:
        return 0
    values_parts = []
    for r in rows:
        values_parts.append(
            "("
            f"{sql_literal(r['question_id'])}, "
            f"{sql_literal(r['exam_profile'])}, "
            f"{sql_literal(r['topic'])}, "
            f"{sql_literal(r['subtopic'])}, "
            f"{jsonb_literal(r['question_data'])}, "
            f"{sql_literal(r['difficulty'])}, "
            f"{sql_literal(r['source'])}, "
            f"{sql_literal(r['verification_status'])}, "
            f"{sql_literal(r.get('fsm_tag'))}, "
            "NOW()"
            ")"
        )
    sql = (
        "INSERT INTO public.cached_questions "
        "(question_id, exam_profile, topic, subtopic, question_data, "
        " difficulty, source, verification_status, fsm_tag, generated_at) "
        "VALUES " + ", ".join(values_parts) + " "
        "ON CONFLICT (question_id) DO NOTHING;"
    )
    db_query(sql)
    return len(rows)

# ---------------------------------------------------------------------------
# Per-chapter pipeline
# ---------------------------------------------------------------------------

def process_chapter(chapter: Dict[str, str], n: int) -> Dict[str, int]:
    """Generate n questions for one chapter and insert into cached_questions."""
    eps = exam_profiles_for(chapter["board"])
    rows_to_insert: List[Dict[str, Any]] = []
    stats = {"generated": 0, "rag_grounded": 0, "failed": 0}

    for i in range(n):
        resp = generate_one(chapter, eps[0])
        if resp is None:
            stats["failed"] += 1
            continue
        q = extract_question(resp)
        if q is None:
            stats["failed"] += 1
            continue
        question_data = q.get("question_data") or q
        vs = q.get("verification_status") or "v3-unverified-ai"
        if vs == "v3-verified-rag":
            stats["rag_grounded"] += 1
        fsm = (question_data or {}).get("fsmTag") or q.get("fsm_tag") or ""
        stats["generated"] += 1

        # One row per exam profile (NCERT writes to both AP + TS).
        for ep in eps:
            rows_to_insert.append({
                "question_id": f"warm-{uuid.uuid4().hex[:16]}",
                "exam_profile": ep,
                "topic": chapter["chapter"],
                "subtopic": "mixed",
                "question_data": question_data,
                "difficulty": DIFFICULTY,
                "source": SOURCE_TAG,
                "verification_status": vs,
                "fsm_tag": fsm,
            })

    inserted = bulk_insert(rows_to_insert)
    stats["inserted"] = inserted
    return stats

# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------

def load_checkpoint() -> Dict[str, Any]:
    if CHECKPOINT_FILE.exists():
        try:
            return json.loads(CHECKPOINT_FILE.read_text())
        except Exception:
            return {}
    return {}

def save_checkpoint(state: Dict[str, Any]) -> None:
    CHECKPOINT_FILE.write_text(json.dumps(state, indent=2))

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    global SVC_KEY
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--questions-per-chapter", type=int, default=30)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--start-from", type=str, default=None)
    parser.add_argument("--board", type=str, default=None, choices=["NCERT", "BIEAP", "TSBIE"])
    args = parser.parse_args()

    print(f"[cache-warm] Fetching chapters from knowledge_nodes...")
    chapters = get_chapters(board_filter=args.board)
    print(f"[cache-warm] Found {len(chapters)} chapters")

    if args.start_from:
        before = len(chapters)
        chapters = [c for c in chapters if c["chapter"] >= args.start_from]
        print(f"[cache-warm] Filtered to {len(chapters)} chapters (skipped {before - len(chapters)} before '{args.start_from}')")

    # Filter out chapters already done according to checkpoint
    checkpoint = load_checkpoint()
    done_ids = set(checkpoint.get("done_chapter_ids", []))
    remaining = [c for c in chapters if c["id"] not in done_ids]
    if done_ids:
        print(f"[cache-warm] Resuming — {len(done_ids)} chapters already complete, {len(remaining)} remaining")

    if not remaining:
        print("[cache-warm] Nothing to do. Delete .cache-warm-checkpoint.json to start over.")
        return 0

    if args.dry_run:
        print(f"\n=== DRY RUN ===")
        print(f"Would generate {args.questions_per_chapter} questions for each of {len(remaining)} chapters")
        print(f"Total API calls: {len(remaining) * args.questions_per_chapter}")
        print(f"Concurrency: {args.concurrency}")
        ncert_count = sum(1 for c in remaining if c['board'] == 'NCERT')
        ap_count = sum(1 for c in remaining if c['board'] == 'BIEAP')
        ts_count = sum(1 for c in remaining if c['board'] == 'TSBIE')
        print(f"\nBreakdown by board: NCERT={ncert_count} (writes 2 rows/q), BIEAP={ap_count} (1 row/q), TSBIE={ts_count} (1 row/q)")
        rows = ncert_count * args.questions_per_chapter * 2 + (ap_count + ts_count) * args.questions_per_chapter
        print(f"Estimated rows inserted into cached_questions: {rows}")
        print(f"\nFirst 8 chapters:")
        for c in remaining[:8]:
            eps = exam_profiles_for(c["board"])
            print(f"  - {c['board']:6} | class {c['class_level']:>2} | {c['subject']:12} | {c['chapter'][:60]:60} | exam_profiles: {eps}")
        return 0

    # Need service-role key for the actual edge-function calls
    print(f"[cache-warm] Fetching service_role key via Management API...")
    SVC_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or fetch_service_role_key()

    # Run
    print(f"\n[cache-warm] Starting — {len(remaining)} chapters × {args.questions_per_chapter} questions each = {len(remaining) * args.questions_per_chapter} generate-batch calls")
    print(f"[cache-warm] Concurrency: {args.concurrency}")
    print(f"[cache-warm] Source tag (for bulk-delete later if needed): {SOURCE_TAG}")
    print()

    overall = {"chapters_done": 0, "generated": 0, "rag_grounded": 0, "inserted": 0, "failed": 0}
    started_at = time.time()

    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {pool.submit(process_chapter, c, args.questions_per_chapter): c for c in remaining}
        for fut in as_completed(futures):
            c = futures[fut]
            try:
                stats = fut.result()
            except Exception as e:
                print(f"[cache-warm] EXCEPTION on chapter '{c['chapter']}': {e}", file=sys.stderr)
                continue

            overall["chapters_done"] += 1
            overall["generated"] += stats["generated"]
            overall["rag_grounded"] += stats["rag_grounded"]
            overall["inserted"] += stats["inserted"]
            overall["failed"] += stats["failed"]

            done_ids.add(c["id"])
            checkpoint["done_chapter_ids"] = list(done_ids)
            checkpoint["last_updated"] = datetime.utcnow().isoformat() + "Z"
            save_checkpoint(checkpoint)

            elapsed_min = (time.time() - started_at) / 60
            pct = overall["chapters_done"] * 100 / len(remaining)
            rag_pct = (stats["rag_grounded"] * 100 / max(stats["generated"], 1))
            print(
                f"[cache-warm] ✓ {c['board']:6} | class {c['class_level']:>2} | {c['subject']:12} | "
                f"{c['chapter'][:50]:50} | "
                f"gen={stats['generated']:>2} rag={stats['rag_grounded']:>2}({rag_pct:>3.0f}%) ins={stats['inserted']:>2} fail={stats['failed']:>2} | "
                f"progress {overall['chapters_done']}/{len(remaining)} ({pct:.0f}%) | elapsed {elapsed_min:.1f}m"
            )

    print()
    print(f"=== DONE ===")
    print(f"Chapters processed: {overall['chapters_done']}")
    print(f"Questions generated: {overall['generated']}")
    print(f"RAG-grounded (v3-verified-rag): {overall['rag_grounded']} ({overall['rag_grounded']*100//max(overall['generated'],1)}%)")
    print(f"Rows inserted into cached_questions: {overall['inserted']}")
    print(f"Failed calls: {overall['failed']}")
    print(f"Wall clock: {(time.time()-started_at)/60:.1f} min")
    print()
    print(f"To bulk-delete this batch if quality is poor:")
    print(f"  DELETE FROM public.cached_questions WHERE source = '{SOURCE_TAG}';")
    return 0


if __name__ == "__main__":
    sys.exit(main())
