
import React from 'react';

// Drut brand icon with gradient
export const DrutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
        <defs>
            <linearGradient id="drut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5cbb21" />
                <stop offset="100%" stopColor="#cbe856" />
            </linearGradient>
        </defs>
        <path d="M15.5,2H8.5C4.91,2,2,4.91,2,8.5v7C2,19.09,4.91,22,8.5,22h7C19.09,22,22,19.09,22,15.5v-7 C22,4.91,19.09,2,15.5,2z M10,19H8.5C6.02,19,4,16.98,4,14.5v-5C4,6.02,6.02,4,8.5,4H10V19z" fill="url(#drut-gradient)" />
    </svg>
);


export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className={className}
    >
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.357-11.297-7.94l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.577,34.238,48,27.421,48,20C48,18.145,47.854,16.33,47.534,14.601L43.611,20.083z"></path>
    </svg>
);

export const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
    </svg>
);

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    // FIX: Corrected the malformed viewBox attribute which was causing parsing errors.
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export const LayoutDashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
);

export const PracticeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="m9 14 2 2 4-4" />
    </svg>
);

export const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19.39,13.25a4.26,4.26,0,0,0-4.13,4.38,4.35,4.35,0,0,0,4.47,4.12,4.26,4.26,0,0,0,4.13-4.37A4.34,4.34,0,0,0,19.39,13.25Zm0,7a2.84,2.84,0,0,1-3-2.81,2.9,2.9,0,0,1,2.88-3,2.85,2.85,0,0,1,3,2.81A2.9,2.9,0,0,1,19.39,20.25Z" transform="translate(-5.54 -2.75)" />
        <path d="M12.43,10.62A4.2,4.2,0,0,0,8.27,6.23a4.2,4.2,0,0,0-4.16,4.39,4.2,4.2,0,0,0,4.16,4.39,4.2,4.2,0,0,0,4.16-4.39Zm-4.16,3a2.89,2.89,0,0,1-2.92-2.82A2.89,2.89,0,0,1,8.27,8a2.89,2.89,0,0,1,2.92,2.82A2.89,2.89,0,0,1,8.27,13.62Z" transform="translate(-5.54 -2.75)" />
        <path d="M8.27,14.75a4.34,4.34,0,0,0,4.47,4.12,4.26,4.26,0,0,0,4.13-4.37,4.35,4.35,0,0,0-4.47-4.12,4.26,4.26,0,0,0-4.13,4.37Zm4.39-2.81a2.85,2.85,0,0,1,3,2.81,2.9,2.9,0,0,1-2.88,3,2.84,2.84,0,0,1-3-2.81A2.9,2.9,0,0,1,12.66,11.94Z" transform="translate(-5.54 -2.75)" />
        <polygon points="13.25 2.75 13.25 5.25 10.75 5.25 10.75 2.75 13.25 2.75" />
    </svg>
);

export const PlayStoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.43,12.43,5,2.14a.5.5,0,0,0-.79.43V21.43a.5.5,0,0,0,.79.43L21.43,12.57A.5.5,0,0,0,21.43,12.43ZM6,4.2,18.7,12.43,6,20.66Z" />
    </svg>
);

export const PlayCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
);

export const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export const BoltIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

export const BrainCircuitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5V2M12 22v-3" /><path d="M17 9a5 5 0 0 1-10 0" /><path d="M5 14a2.5 2.5 0 0 1 5 0" /><path d="M14 14a2.5 2.5 0 0 1 5 0" /><path d="M2 14h1.5" /><path d="M20.5 14H22" /><path d="M9 14h6" /><path d="M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /><path d="M15 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>
);

export const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);