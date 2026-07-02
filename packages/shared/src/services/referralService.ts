/**
 * referralService — client-side helpers for Drut's symmetric-reward referral
 * program. Sits between the browser (localStorage capture at /r/:code) and
 * the DB (attribute_referral RPC + user_referrals table).
 *
 * Web + mobile can share this — no DOM assumptions beyond a `typeof
 * localStorage` guard so mobile (React Native) short-circuits before
 * touching web-only APIs.
 *
 * Fire-and-forget by design: attribution must never fail signup. Every
 * catchable failure path degrades to a silent no-op.
 */

import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

const STORAGE_KEY = 'drut.referral_code';
const TTL_MS      = 30 * 24 * 60 * 60 * 1000;   // matches ReferralCapture's storedAt intent

interface StoredReferral {
  code: string;
  storedAt: string;   // ISO
}

/**
 * Called from App.tsx's onAuthStateChange whenever a session becomes
 * available. If the browser has a valid, non-expired referral code in
 * localStorage, we call the DB RPC to attribute it and then remove the
 * localStorage entry so we never retry.
 *
 * Idempotency lives at the DB level (attribute_referral rejects
 * already-attributed callers), so it's safe if this fires twice during
 * an OAuth roundtrip — the RPC will just return 'already_attributed'.
 *
 * Only touches localStorage when it's defined (guards RN, where it isn't).
 */
export async function tryAttributeStoredReferral(): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  // Consume optimistically so a malformed / expired entry never sticks around.
  localStorage.removeItem(STORAGE_KEY);

  let code: string | null = null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredReferral>;
    if (typeof parsed.code !== 'string' || typeof parsed.storedAt !== 'string') return;
    const age = Date.now() - Date.parse(parsed.storedAt);
    if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return;
    code = parsed.code;
  } catch {
    return;
  }

  if (!code) return;

  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.rpc('attribute_referral', { p_code: code });
    if (error) {
      log.warn('[referralService] attribute_referral RPC error:', error.message || error);
      return;
    }
    log.info('[referralService] attribution result:', data);
  } catch (e) {
    log.warn('[referralService] attribute_referral threw:', e);
  }
}
