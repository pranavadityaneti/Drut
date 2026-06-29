import React, { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { authService, getSupabase } from '@drut/shared';
import { Check, Lock } from 'lucide-react';

const { updateUser } = authService;

/**
 * UpdatePasswordForm — the second half of the password-recovery flow, reached at
 * /update-password via the link in the reset email (resetPasswordForEmail sends users
 * here). The recovery link establishes a Supabase session (detectSessionInUrl), and
 * supabase.auth.updateUser({ password }) sets the new password on that session.
 *
 * Previously this screen did not exist, so the recovery link landed on "/" and was
 * auto-redirected to the dashboard — the flow was a dead end.
 *
 * Style mirrors ForgotPasswordForm; standalone (its own centered canvas) since the
 * recovery link can land here cold.
 */

const inputCls =
  "w-full h-11 rounded-[10px] bg-[var(--color-card)] ring-hairline-strong px-3.5 text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 transition-shadow";

export const UpdatePasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // null = still checking; true/false = recovery session present or not.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setHasSession(false); return; }
    // detectSessionInUrl consumes the recovery tokens on load; confirm a session exists.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await updateUser({ password });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Could not update your password. The reset link may have expired — request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-muted)] px-4">
      <div className="w-full max-w-[420px] bg-[var(--color-bg,#fff)] rounded-[16px] ring-hairline-strong p-8">
        {children}
      </div>
    </div>
  );

  // === Success ===
  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-4">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_0_0_8px_rgba(92,187,33,0.15),0_0_0_16px_rgba(92,187,33,0.08)]">
            <Check className="h-7 w-7" strokeWidth={3} />
          </span>
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-6">
            Password updated
          </h1>
          <p className="text-[14px] text-[var(--color-ink-3)] mt-3 max-w-[34ch]">
            Your password has been changed. You can now sign in with your new password.
          </p>
          <Button variant="ink" className="w-full h-11 mt-6" onClick={() => { window.location.href = '/dashboard'; }}>
            Continue
          </Button>
        </div>
      </Shell>
    );
  }

  // === No recovery session (link missing/expired) ===
  if (hasSession === false) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-4">
          <p className="label-uppercase">Reset password</p>
          <h1 className="text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-2">
            Reset link expired
          </h1>
          <p className="text-[14px] text-[var(--color-ink-3)] mt-3 max-w-[36ch]">
            This password-reset link is invalid or has expired. Request a fresh one from the sign-in screen.
          </p>
          <Button variant="ink" className="w-full h-11 mt-6" onClick={() => { window.location.href = '/login'; }}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  // === Form (default; also shown while hasSession === null) ===
  return (
    <Shell>
      <div className="mb-8">
        <p className="label-uppercase">Reset password</p>
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-2">
          Set a new password
        </h1>
        <p className="text-[14px] text-[var(--color-ink-3)] mt-3">
          Choose a strong password you don't use elsewhere.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="label-uppercase" htmlFor="new-password">New password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-ink-3)]" />
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls + ' pl-9'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label-uppercase" htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="relative flex items-center gap-2 p-3 rounded-[10px] bg-[#fde7e5] overflow-hidden">
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-destructive)]" />
            <span className="text-[12px] font-medium text-[var(--color-destructive)] pl-2">{error}</span>
          </div>
        )}

        <Button type="submit" variant="ink" className="w-full h-11 mt-2" isLoading={isLoading}>
          {isLoading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Shell>
  );
};
