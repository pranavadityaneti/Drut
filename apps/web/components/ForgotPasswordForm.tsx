import React, { useState } from 'react';
import { Button } from './ui/Button';
import { authService } from '@drut/shared';
import { ArrowLeft } from 'lucide-react';
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
          Enter your email and we'll send you a link to reset it.
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

        {successMessage && (
          <div className="relative flex items-center gap-2 p-3 rounded-[10px] bg-[var(--color-accent)] overflow-hidden">
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-primary)]" />
            <span className="text-[12px] font-medium text-[#3d7a0f] pl-2">{successMessage}</span>
          </div>
        )}

        <Button type="submit" variant="ink" className="w-full h-11 mt-2" isLoading={isLoading}>
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <div className="mt-10 text-center text-[13px] text-[var(--color-ink-3)]">
        Remember it?{' '}
        <button onClick={onSwitchToLogin} className="text-[#3d7a0f] font-semibold hover:underline">
          Sign in
        </button>
      </div>
    </div>
  );
};
