import React, { useState } from 'react';
import { Button } from './ui/Button';
import { authService } from '@drut/shared';
import { ArrowLeft, Mail, Check } from 'lucide-react';
const { resetPasswordForEmail } = authService;

/**
 * ForgotPasswordForm — editorial refresh.
 *
 * Matches the LoginForm / SignupForm template. Drops the Card wrapper —
 * AuthLayout already provides the canvas. Success message gets the muted-
 * lime banner pattern; error gets the muted-red banner.
 */

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

const inputCls =
  "w-full h-11 rounded-[10px] bg-[var(--color-card)] ring-hairline-strong px-3.5 text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 transition-shadow";

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await resetPasswordForEmail(email);
      setSuccessMessage('Reset link sent. Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // === Success state: full celebratory replacement ===
  if (successMessage) {
    return (
      <div className="w-full">
        <div className="relative flex flex-col items-center text-center py-8">
          {/* Halftone corner ornament behind the chip */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(61,122,15,0.22) 1px, transparent 1.4px)',
              backgroundSize: '7px 7px',
              WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
              maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 65%)',
            }}
          />

          {/* Large lime check chip with halo */}
          <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_0_0_8px_rgba(92,187,33,0.15),0_0_0_16px_rgba(92,187,33,0.08)]">
            <Check className="h-7 w-7" strokeWidth={3} />
          </span>

          <p className="label-uppercase mt-6 relative z-10">Email sent</p>
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-2 relative z-10">
            Check your email
          </h1>
          <p className="text-[14px] text-[var(--color-ink-3)] mt-3 max-w-[36ch] relative z-10">
            We sent a password reset link to
          </p>

          {/* Echoed email — outlined chip */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] ring-hairline-strong bg-[var(--color-card)] relative z-10">
            <Mail className="h-3.5 w-3.5 text-[var(--color-ink-3)]" />
            <span className="text-[13px] font-semibold text-[var(--color-ink-1)] num-tabular">{email}</span>
          </div>

          <p className="text-[12px] text-[var(--color-ink-3)] mt-6 max-w-[40ch] leading-relaxed relative z-10">
            Click the link in the email to reset your password. If it doesn't arrive in a minute, check spam or try resending.
          </p>

          <div className="flex items-center gap-2 mt-6 relative z-10">
            <button
              onClick={() => { setSuccessMessage(''); }}
              className="text-[12px] font-semibold text-[#3d7a0f] hover:underline"
            >
              Resend email
            </button>
            <span className="text-[var(--color-ink-4)]">·</span>
            <button
              onClick={onSwitchToLogin}
              className="text-[12px] font-semibold text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)]"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Form state ===
  return (
    <div className="w-full">
      <button
        onClick={onSwitchToLogin}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </button>

      <div className="mb-8">
        <p className="label-uppercase">Reset password</p>
        <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-2">
          Forgot password
        </h1>
        <p className="text-[14px] text-[var(--color-ink-3)] mt-3">
          It happens. Drop your email and we'll send the reset link in a minute.
        </p>
      </div>

      <form onSubmit={handleResetSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="label-uppercase" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@drut.club"
          />
        </div>

        {error && (
          <div className="relative flex items-center gap-2 p-3 rounded-[10px] bg-[#fde7e5] overflow-hidden">
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-destructive)]" />
            <span className="text-[12px] font-medium text-[var(--color-destructive)] pl-2">{error}</span>
          </div>
        )}

        <Button type="submit" variant="ink" className="w-full h-11 mt-2" isLoading={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  );
};
