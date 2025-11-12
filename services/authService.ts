import { User } from '../types';

const USER_KEY = 'drut-user';

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const login = (email: string): User => {
  const user: User = { email };
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
};

// For simulation, signup is the same as login
export const signup = (email: string): User => {
  return login(email);
};

export const loginWithGoogle = (): User => {
    // Simulate logging in with a Google account
    const googleUserEmail = 'signed.in.with.google@drut.app';
    return login(googleUserEmail);
}


export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
};