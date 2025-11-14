import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { resetPasswordForEmail } from '../services/authService';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

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
      setSuccessMessage('Password reset link sent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email to receive a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetSubmit} className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Send Reset Link
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-center text-sm w-full">
          Remember your password?{" "}
          <button onClick={onSwitchToLogin} className="underline">
            Login
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};