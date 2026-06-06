import React, { useState, useEffect } from 'react';
import { SidebarTrigger } from './ui/AppShell';
import { supabase } from '@drut/shared';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/DropdownMenu';
import { User } from '@drut/shared';
import { MobileNav } from './MobileNav';
import { ChevronDown, User as UserIcon, LogOut } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  setCurrentPage,
  onLogout,
}) => {
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

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`;

  return (
    <>
      {/* Mobile Navigation */}
      <MobileNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={onLogout}
      />

      <header className="sticky top-0 z-30 flex h-16 items-center bg-[var(--color-background)] px-4 lg:px-8">
        <div className="flex w-full items-center justify-between">

          {/* Left: brand on mobile, empty on desktop */}
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger />
            <div className="lg:hidden">
              <img src="/brand-logo.png" alt="Drut" className="h-7" />
            </div>
          </div>

          {/* Right: profile dropdown (desktop only) */}
          <div className="hidden lg:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] hover:bg-[var(--color-muted)] transition-colors">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full bg-[var(--color-muted)]"
                  />
                  <div className="text-left">
                    <p className="text-[13px] font-semibold text-[var(--color-ink-1)] leading-tight tracking-tight">{userName}</p>
                    <p className="text-[11px] text-[var(--color-ink-3)] leading-tight num-tabular">{user?.email || 'Loading...'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[var(--color-ink-3)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-[14px] p-1.5 bg-[var(--color-card)] ring-hairline border-none shadow-soft"
              >
                <DropdownMenuItem
                  onClick={() => setCurrentPage('profile')}
                  className="rounded-[10px] cursor-pointer hover:bg-[var(--color-muted)] p-2.5 transition-colors flex items-center gap-3"
                >
                  <UserIcon className="w-4 h-4 text-[var(--color-ink-3)]" />
                  <span className="text-[13px] font-medium text-[var(--color-ink-1)]">My Profile</span>
                </DropdownMenuItem>
                <div className="h-px bg-[var(--color-ink-5)] my-1" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="rounded-[10px] cursor-pointer text-[var(--color-destructive)] hover:bg-[#fde7e5]/60 p-2.5 transition-colors flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
};
