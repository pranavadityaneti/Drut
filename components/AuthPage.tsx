
import React, { useState } from 'react';
import { User } from '../types';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PayMeIcon } from './icons/Icons';


interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');

  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-pay-green-dark text-white flex size-8 items-center justify-center rounded-md">
            <PayMeIcon className="size-5" />
          </div>
          <span className="text-xl font-semibold">PayMe App</span>
        </a>
        {view === 'login' ? (
            <LoginForm 
                onLoginSuccess={onLoginSuccess} 
                onSwitchToSignup={() => setView('signup')}
            />
        ) : (
            <SignupForm 
                onLoginSuccess={onLoginSuccess}
                onSwitchToLogin={() => setView('login')}
            />
        )}
      </div>
    </div>
  );
};