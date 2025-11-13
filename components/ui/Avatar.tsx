

import React from 'react';

interface AvatarProps {
  email: string;
  className?: string;
  src?: string | null;
}

const getInitials = (email: string) => {
    if (!email) return '?';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ email, className = '', src }) => {
   if (src) {
    return (
        <img src={src} alt={email} className={`object-cover h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} />
    )
  }
  return (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full items-center justify-center bg-primary/10 text-primary font-semibold ${className}`}>
      <span>{getInitials(email)}</span>
    </div>
  );
};
