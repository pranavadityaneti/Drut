import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Prefer non-public names on server side
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return res.status(500).json({ ok: false, supabase: 'missing_env' });
  }

  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    // Optional tiny RPC to verify DB responds (see SQL below)
    const { error } = await supabase.rpc('drut_ping_v1');
    return res.status(200).json({
      ok: !error,
      supabase: !error ? 'connected' : 'rpc_missing_or_error',
      error: error ?? null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, supabase: 'exception', error: String(e?.message || e) });
  }
}