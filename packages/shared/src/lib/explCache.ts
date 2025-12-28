export type Explanation = { fast_md?: string; full_md?: string; fast_safe?: boolean; risk_shortcut?: number };

const mem = new Map<string, Explanation>();

export function upsertExplanationCache(qid: string, data: Explanation) {
  mem.set(qid, data);
  try { 
    if (typeof window !== 'undefined') {
      localStorage.setItem(`qe:${qid}`, JSON.stringify(data)); 
    }
  } catch {}
}

export function getFromExplanationCache(qid: string): Explanation | null {
  if (mem.has(qid)) return mem.get(qid)!;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`qe:${qid}`);
      return raw ? (JSON.parse(raw) as Explanation) : null;
    }
    return null;
  } catch { return null; }
}

export function waitForRealtimeOnce(qid: string, onReady: (e: Explanation)=>void, timeoutMs=4000) {
  const started = Date.now();
  const t = setInterval(() => {
    const e = getFromExplanationCache(qid);
    if (e?.fast_md || e?.full_md) {
      clearInterval(t);
      onReady(e);
    } else if (Date.now() - started > timeoutMs) {
      clearInterval(t);
    }
  }, 150);
}
