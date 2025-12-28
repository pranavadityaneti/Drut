import React, { useState } from 'react';
import { User } from '@drut/shared';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { DrutIcon } from './icons/Icons';


interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  defaultMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, defaultMode = 'login' }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>(defaultMode);

  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-pay-green-dark text-white flex size-8 items-center justify-center rounded-md">
            <DrutIcon className="size-5" />
          </div>
          <span className="text-xl font-semibold">Drut</span>
        </a>
        {view === 'login' && (
          <LoginForm
            onLoginSuccess={onLoginSuccess}
            onSwitchToSignup={() => setView('signup')}
            onSwitchToForgotPassword={() => setView('forgot-password')}
          />
        )}
        {view === 'signup' && (
          <SignupForm
            onLoginSuccess={onLoginSuccess}
            onSwitchToLogin={() => setView('login')}
          />
        )}
        {view === 'forgot-password' && (
          <ForgotPasswordForm
            onSwitchToLogin={() => setView('login')}
          />
        )}
      </div>
    </div>
  );
};