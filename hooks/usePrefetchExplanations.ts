
import { useEffect, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { upsertExplanationCache } from "../lib/explCache";

type Q = { id: string };

export function usePrefetchExplanations(current: Q | null, next: Q[]) {
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const nextIds = useMemo(() => next.map(n => n.id).join(','), [next]);

  useEffect(() => {
    if (!current) return;

    // Helper to check if ID is a valid UUID format (not a hash-based ID like "qid_...")
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    const targets = [current, ...next.slice(0, 2)].filter(q => q && q.id && isValidUUID(q.id));
    targets.forEach(t => {
      // Fire-and-forget RPC call, handling potential errors silently in the background.
      // The Supabase v2 client returns a promise-like object that should be awaited,
      // it does not have a .catch() method.
      (async () => {
        const { error } = await supabase.rpc("drut_get_or_enqueue_expl_v1", { p_question_id: t.id });
        if (error) {
          console.warn(`[usePrefetchExplanations] RPC call failed for question ${t.id}:`, error.message);
        }
      })();
    });

    if (!subRef.current) {
      subRef.current = supabase
        .channel("qe_updates")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "question_explanations" },
          (payload) => {
            const row = payload.new as any;
            if (row?.status === "ready") {
              upsertExplanationCache(row.question_id, {
                fast_md: row.fast_md,
                full_md: row.full_md,
                fast_safe: row.fast_safe,
                risk_shortcut: row.risk_shortcut
              });
            }
          }
        )
        .subscribe();
    }
    
    // Cleanup subscription on component unmount
    return () => {
        if (subRef.current) {
            supabase.removeChannel(subRef.current);
            subRef.current = null;
        }
    }
  }, [current?.id, nextIds]);
}
