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

    // Admin users get extra nav items
    const isAdmin = user?.email === 'pranav.n@ideaye.in';
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
            {/* Hamburger Button - visible only on mobile */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-5 right-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-accent transition-colors"
                aria-label="Open navigation menu"
            >
                <Menu className="w-6 h-6 text-foreground" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-out Drawer */}
            <div
                className={cn(
                    "lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-card border-l border-border shadow-xl transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-border">
                    <img src="/brand-logo.png" alt="Drut" className="h-8" />
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* User Profile Section */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <img
                            src={avatarUrl}
                            alt="Profile"
                            className="h-12 w-12 rounded-full border-2 border-white shadow-sm bg-gray-100"
                        />
                        <div>
                            <p className="font-semibold text-foreground">{userName}</p>
                            <p className="text-sm text-muted-foreground">{user?.email || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-2 p-4">
                    {allNavItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 rounded-lg text-base font-medium transition-all duration-200",
                                currentPage === item.id
                                    ? "text-white shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={currentPage === item.id ? { backgroundColor: '#5cbb21' } : undefined}
                        >
                            <item.icon className={cn(
                                "h-6 w-6 flex-shrink-0",
                                currentPage === item.id ? "text-white" : ""
                            )} />
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* Profile Link */}
                    <button
                        onClick={() => handleNavClick('profile')}
                        className={cn(
                            "flex items-center gap-4 px-4 py-3.5 rounded-lg text-base font-medium transition-all duration-200",
                            currentPage === 'profile'
                                ? "text-white shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        style={currentPage === 'profile' ? { backgroundColor: '#5cbb21' } : undefined}
                    >
                        <UserIcon className={cn(
                            "h-6 w-6 flex-shrink-0",
                            currentPage === 'profile' ? "text-white" : ""
                        )} />
                        <span>My Profile</span>
                    </button>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 w-full px-4 py-3.5 rounded-lg text-base font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-6 w-6 flex-shrink-0" />
                        <span>Sign out</span>
                    </button>
                </div>
            </div>
        </>
    );
};
