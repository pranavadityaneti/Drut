import React, { useState } from 'react';
import { Button } from './ui/Button';
import { authService } from '@drut/shared';
const { login, loginWithGoogle } = authService;
import { User } from '@drut/shared';
import { GoogleIcon } from './icons/Icons';
import { Eye, EyeOff } from 'lucide-react';

/**
 * LoginForm — editorial refresh.
 *
 * Editorial header pattern (eyebrow + display-h1 + muted subtitle).
 * Inputs match the rest of the system (10px corners, ring-hairline-strong,
 * lime focus). Submit is the ink Button variant. Social buttons swap from
 * black circles to outline-style squares with hairlines. "Forgot password"
 * and "Register now" links use deep lime.
 */

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

const inputCls =
  "w-full h-11 rounded-[10px] bg-[var(--color-card)] ring-hairline-strong px-3.5 text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 transition-shadow";

const socialCls =
  "inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-card)] ring-hairline-strong text-[var(--color-ink-1)] hover:bg-[var(--color-muted)] transition-colors";

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const { user } = await login(email, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid login credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="label-uppercase">Welcome back</p>
        <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)] mt-2">
          Sign in to Drut
        </h1>
        <p className="text-[14px] text-[var(--color-ink-3)] mt-3">
          Pick up where you left off. Your last session is waiting.
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="label-uppercase" htmlFor="password">Password</label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-[11px] font-semibold text-[#3d7a0f] hover:underline"
            >
              Forgot password
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-11`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="relative flex items-center gap-2 p-3 rounded-[10px] bg-[#fde7e5] overflow-hidden">
            <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-destructive)]" />
            <span className="text-[12px] font-medium text-[var(--color-destructive)] pl-2">{error}</span>
          </div>
        )}

        <Button type="submit" variant="ink" className="w-full h-11 mt-2" isLoading={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--color-ink-5)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--color-card)] px-3 label-uppercase">or continue with</span>
        </div>
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleGoogleSubmit}
          disabled={isGoogleLoading}
          className={socialCls}
          aria-label="Continue with Google"
        >
          {isGoogleLoading
            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-ink-1)] border-t-transparent" />
            : <GoogleIcon className="h-4 w-4" />}
        </button>

        <button className={socialCls} aria-label="Continue with Apple">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M17.2,16.4c-0.6,0.9-1.3,2.2-2.3,2.2c-0.9,0.1-1.2-0.6-2.4-0.6s-1.5,0.6-2.2,0.6c-0.9,0-1.8-1.5-2.7-2.9C6.5,14,5.8,11.3,6.8,9.6c0.9-1.5,2.5-2.4,3.3-2.5c0.9-0.1,1.8,0.6,2.3,0.6c0.5,0,1.6-0.8,2.8-0.6c1,0.1,3.4,0.4,4.5,2.1c-0.1,0.1-2.7,1.6-2.7,4.8C14.7,15.6,15.8,16.8,17.2,16.4z M14.8,5.4c0.5-0.6,0.8-1.4,0.7-2.2c-0.7,0-1.6,0.5-2.1,1.1c-0.5,0.6-0.9,1.5-0.7,2.3C13.5,6.7,14.3,6.1,14.8,5.4z" /></svg>
        </button>

        <button className={socialCls} aria-label="Continue with Facebook">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.66-2.797 3.54v1.241h5.37l-.653 3.667h-4.717v7.98H9.101Z" /></svg>
        </button>
      </div>

      <div className="mt-10 text-center text-[13px] text-[var(--color-ink-3)]">
        Not a member?{' '}
        <button onClick={onSwitchToSignup} className="text-[#3d7a0f] font-semibold hover:underline">
          Register now
        </button>
      </div>
    </div>
  );
};
