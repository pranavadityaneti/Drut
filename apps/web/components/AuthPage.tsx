import React, { useState } from 'react';
import { User } from '@drut/shared';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { AuthLayout } from './AuthLayout';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  defaultMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, defaultMode = 'login' }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>(defaultMode);

  return (
    <AuthLayout>
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
    </AuthLayout>
  );
};