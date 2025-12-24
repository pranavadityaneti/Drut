import React, { useState, useEffect } from 'react';
import { SidebarTrigger } from './ui/AppShell';
import { supabase } from '../lib/supabase';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/DropdownMenu';
import { User } from '../types';
import { MobileNav } from './MobileNav';

import { Switch } from './ui/switch-new';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onLogout: () => void;
  useMockData?: boolean;
  setUseMockData?: (useMock: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  setCurrentPage,
  onLogout,
  useMockData = false,
  setUseMockData
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

      <header className="sticky top-0 z-30 flex h-20 items-center bg-background/80 backdrop-blur-md px-4 lg:px-8 transition-all duration-200">
        <div className="flex w-full items-center justify-between">

          {/* Left: Brand logo on mobile, empty space on desktop */}
          <div className="flex items-center gap-4 flex-1">
            <SidebarTrigger />
            {/* Mobile: Show brand logo */}
            <div className="lg:hidden">
              <img src="/brand-logo.png" alt="Drut" className="h-7" />
            </div>
          </div>

          {/* Right: User Profile with Dropdown - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-6">
            {/* Mock Data Toggle */}
            {setUseMockData && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {useMockData ? 'Mock Data' : 'Real Data'}
                </span>
                <Switch
                  checked={useMockData}
                  onCheckedChange={setUseMockData}
                  title="Toggle Data Mode"
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-6 border-l border-gray-200 hover:opacity-80 transition-opacity">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-10 w-10 rounded-full border-2 border-white shadow-sm bg-gray-100"
                  />
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground leading-none">{userName}</p>
                    <p className="text-xs text-gray-400 mt-1 leading-none">{user?.email || 'Loading...'}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-soft border-none p-2 bg-white">
                <DropdownMenuItem
                  onClick={() => setCurrentPage('profile')}
                  className="rounded-xl cursor-pointer hover:bg-gray-100 p-3 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium text-gray-700">My Profile</span>
                </DropdownMenuItem>
                <div className="h-px bg-gray-100 my-1" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="rounded-xl cursor-pointer text-red-500 hover:bg-red-50 p-3 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
};