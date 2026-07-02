// ReferralCapture — the `/r/:code` landing page.
//
// PURPOSE: When a prospect opens someone's invite link, we need to remember
// which referrer sent them BEFORE they sign up, so at signup we can attach
// referred_by_code + referred_by_user_id in public.user_referrals. React
// state alone can't survive the auth flow (OAuth roundtrips, tab switches,
// signup email verification), so localStorage is the persistence mechanism.
//
// TTL: 30 days from storedAt. Attribution reader (signup flow, change #4)
// enforces the TTL — this component just writes a timestamp.
//
// SECURITY: strict regex-validate against our exact alphabet before storing.
// Anything else (junk, injection attempts, XSS payloads via URL) → silently
// drop and still redirect to landing so bad links never look broken to the
// user. No error surface for an attacker to probe.
//
// UX: brief ~1.4s confirmation screen so the referred user gets a signal
// their link worked, then redirect to '/' (landing) where the signup CTA
// lives. `replace: true` on the navigate so the browser back button doesn't
// re-trigger this handler.

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Must exactly match the alphabet in public.generate_referral_code() — 6 chars,
// A-Z minus I/L/O + digits 2-9 (no 0/1). Anything else is treated as junk.
const CODE_PATTERN = /^[A-CDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;
const STORAGE_KEY  = 'drut.referral_code';
const REDIRECT_MS  = 1400;

export const ReferralCapture: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = (code || '').toUpperCase();

    if (CODE_PATTERN.test(normalized)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          code: normalized,
          storedAt: new Date().toISOString(),
        }));
      } catch {
        // localStorage may be disabled (private tab, quota exceeded, sandboxed
        // iframe). Silent — user can still sign up, they just won't have the
        // symmetric reward. This is the failure mode we accept.
      }
    }

    const t = setTimeout(() => navigate('/', { replace: true }), REDIRECT_MS);
    return () => clearTimeout(t);
  }, [code, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#f7faf3',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          backgroundColor: '#fff',
          border: '1px solid #e3e8dd',
          borderRadius: 20,
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(20, 40, 20, 0.06)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 999,
            backgroundColor: '#eaf6dd',
            color: '#3b6d11',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
            marginBottom: 16,
          }}
        >
          ✨ You've been referred
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#16261a',
            margin: '0 0 12px',
            letterSpacing: -0.3,
            lineHeight: 1.2,
          }}
        >
          A friend invited you to Drut
        </h1>

        <p
          style={{
            fontSize: 14.5,
            color: '#5a6b60',
            margin: '0 0 24px',
            lineHeight: 1.55,
          }}
        >
          Both of you get <strong style={{ color: '#16261a' }}>1 month free</strong>{' '}
          when you subscribe to the yearly plan.
        </p>

        <div
          style={{
            fontSize: 12,
            color: '#9aa09a',
            letterSpacing: 0.2,
          }}
        >
          Taking you to sign up…
        </div>
      </div>
    </div>
  );
};
