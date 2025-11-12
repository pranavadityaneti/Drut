import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { signup, loginWithGoogle } from '../services/authService';
import { User } from '../types';
import { GoogleIcon } from './icons/Icons';

interface SignupFormProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onLoginSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
     if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
        const { user } = await signup(email, password);
        if (user) {
            onLoginSuccess(user);
        } else {
            setError('Could not create account.');
        }
    } catch (err: any) {
        setError(err.message || 'Failed to create account.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGoogleSubmit = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      // On success, the onAuthStateChange listener in App.tsx will handle the login.
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your email below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
           <Button variant="outline" className="w-full bg-transparent border-border hover:bg-accent" onClick={handleGoogleSubmit} isLoading={isGoogleLoading}>
             {!isGoogleLoading && <GoogleIcon className="mr-2 h-4 w-4" />}
            Google
          </Button>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <form onSubmit={handleEmailSubmit} className="grid gap-2">
            <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="name@example.com"
                />
            </div>
            <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="••••••••"
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Create Account
            </Button>
        </form>
      </CardContent>
       <CardFooter>
         <div className="text-center text-sm w-full">
            Already have an account?{" "}
            <button onClick={onSwitchToLogin} className="underline">
              Login
            </button>
          </div>
      </CardFooter>
    </Card>
  );
};