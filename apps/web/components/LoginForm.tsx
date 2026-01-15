import React, { useState } from 'react';
import { Button } from './ui/Button';
import { authService } from '@drut/shared';
const { login, loginWithGoogle } = authService;
import { User } from '@drut/shared';
import { GoogleIcon } from './icons/Icons';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

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
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-3">
          Welcome back!
        </h1>
        <p className="text-lg text-slate-500">
          Simplify your workflow and boost your productivity with Drut. Get started for free.
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-5">
        <div className="space-y-5">
          {/* Email Input */}
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-slate-300 bg-white px-6 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
            placeholder="Username or Email"
          />

          {/* Password Input */}
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-slate-300 bg-white px-6 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onSwitchToForgotPassword} className="text-xs font-semibold text-slate-900 hover:underline">
              Forgot Password?
            </button>
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-500 text-center">{error}</p>}

        {/* Black Pill Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-black py-4 text-center text-lg font-bold text-white shadow-lg shadow-black/20 hover:bg-slate-800 disabled:opacity-70 transition-all transform active:scale-95"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white px-4 text-slate-400 font-medium">
            or continue with
          </span>
        </div>
      </div>

      {/* Social Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleGoogleSubmit}
          disabled={isGoogleLoading}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 transition-all border border-transparent"
        >
          {isGoogleLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <GoogleIcon className="h-5 w-5 text-white fill-current" />}
        </button>

        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 transition-all border border-transparent"
        >
          {/* Apple Icon Placeholder */}
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M17.2,16.4c-0.6,0.9-1.3,2.2-2.3,2.2c-0.9,0.1-1.2-0.6-2.4-0.6s-1.5,0.6-2.2,0.6c-0.9,0-1.8-1.5-2.7-2.9C6.5,14,5.8,11.3,6.8,9.6c0.9-1.5,2.5-2.4,3.3-2.5c0.9-0.1,1.8,0.6,2.3,0.6c0.5,0,1.6-0.8,2.8-0.6c1,0.1,3.4,0.4,4.5,2.1c-0.1,0.1-2.7,1.6-2.7,4.8C14.7,15.6,15.8,16.8,17.2,16.4z M14.8,5.4c0.5-0.6,0.8-1.4,0.7-2.2c-0.7,0-1.6,0.5-2.1,1.1c-0.5,0.6-0.9,1.5-0.7,2.3C13.5,6.7,14.3,6.1,14.8,5.4z" /></svg>

        </button>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 transition-all border border-transparent"
        >
          {/* FB Icon Placeholder */}
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.66-2.797 3.54v1.241h5.37l-.653 3.667h-4.717v7.98H9.101Z" /></svg>
        </button>
      </div>

      <div className="mt-12 text-center text-sm font-medium text-slate-500">
        Not a member?{" "}
        <button onClick={onSwitchToSignup} className="text-secondary hover:underline font-bold">
          Register now
        </button>
      </div>
    </div>
  );
};