import React, { useState, useEffect } from 'react';
import { cn } from '@drut/shared';
import { User } from '@drut/shared';
import {
    LayoutDashboard,
    Dumbbell,
    Zap,
    User as UserIcon,
    Upload,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { supabase } from '@drut/shared';
import { isAdminEmail } from '@drut/shared';

interface MobileNavProps {
    currentPage: string;
    setCurrentPage: (page: string) => void;
    onLogout: () => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

export const MobileNav: React.FC<MobileNavProps> = ({
    currentPage,
    setCurrentPage,
    onLogout
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser(authUser as unknown as User);
            }
        };
        loadUser();
    }, []);

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'practice', label: 'Practice', icon: Dumbbell },
        { id: 'sprint', label: 'Sprint', icon: Zap },
    ];

    // Admin users get extra nav items — single client source of truth
    // (@drut/shared isAdminEmail). Previously this only checked one of the two
    // admin emails (drift bug); now both are covered via the shared allowlist.
    const isAdmin = isAdminEmail(user?.email);
    const adminItems: NavItem[] = isAdmin ? [
        { id: 'admin/ingest', label: 'Admin Ingest', icon: Upload },
        { id: 'admin/bulk', label: 'Bulk Ingest', icon: Upload },
    ] : [];

    const allNavItems = [...navItems, ...adminItems];

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`;

    const handleNavClick = (pageId: string) => {
        setCurrentPage(pageId);
        setIsOpen(false);
    };

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    };

    return (
        <>
            {/* Hamburger Button - mobile only */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-card)] ring-hairline-strong text-[var(--color-ink-1)] hover:bg-[var(--color-muted)] transition-colors"
                aria-label="Open navigation menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-[rgba(11,11,13,0.40)] backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-out drawer */}
            <div
                className={cn(
                    "lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-[var(--color-card)] ring-hairline-strong shadow-hover transition-transform duration-300 ease-in-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Drawer header */}
                <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--color-ink-5)]">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-ink-1)] text-white font-bold text-sm">
                            D
                        </span>
                        <span className="font-semibold text-[15px] text-[var(--color-ink-1)] tracking-tight">Drut</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] hover:bg-[var(--color-muted)] transition-colors text-[var(--color-ink-3)]"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* User profile */}
                <div className="px-5 py-4 border-b border-[var(--color-ink-5)]">
                    <div className="flex items-center gap-3">
                        <img
                            src={avatarUrl}
                            alt="Profile"
                            className="h-10 w-10 rounded-full bg-[var(--color-muted)]"
                        />
                        <div className="min-w-0">
                            <p className="font-semibold text-[14px] text-[var(--color-ink-1)] truncate tracking-tight">{userName}</p>
                            <p className="text-[12px] text-[var(--color-ink-3)] truncate num-tabular">{user?.email || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto">
                    {allNavItems.map(item => {
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] transition-colors",
                                    isActive
                                        ? "nav-pill-active"
                                        : "text-[var(--color-ink-3)] font-medium hover:text-[var(--color-ink-1)] hover:bg-[var(--color-muted)]"
                                )}
                            >
                                {isActive && (
                                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                                )}
                                <item.icon className={cn(
                                    "h-[18px] w-[18px] flex-shrink-0",
                                    isActive ? "text-[var(--color-ink-1)]" : "text-[var(--color-ink-3)]"
                                )} />
                                <span className="tracking-tight">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* Profile link */}
                    <button
                        onClick={() => handleNavClick('profile')}
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] transition-colors",
                            currentPage === 'profile'
                                ? "nav-pill-active"
                                : "text-[var(--color-ink-3)] font-medium hover:text-[var(--color-ink-1)] hover:bg-[var(--color-muted)]"
                        )}
                    >
                        {currentPage === 'profile' && (
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                        )}
                        <UserIcon className={cn(
                            "h-[18px] w-[18px] flex-shrink-0",
                            currentPage === 'profile' ? "text-[var(--color-ink-1)]" : "text-[var(--color-ink-3)]"
                        )} />
                        <span className="tracking-tight">My Profile</span>
                    </button>
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-[var(--color-ink-5)]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[14px] font-medium text-[var(--color-destructive)] hover:bg-[#fde7e5]/60 transition-colors"
                    >
                        <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="tracking-tight">Sign out</span>
                    </button>
                </div>
            </div>
        </>
    );
};
