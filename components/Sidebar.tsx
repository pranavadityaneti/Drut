import React from 'react';
import { User } from '../types';
import { Avatar } from './ui/Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/DropdownMenu';
import { DrutIcon, UserIcon, LayoutDashboardIcon, PracticeIcon, LogoutIcon, BoltIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'practice', label: 'Practice', icon: PracticeIcon },
    { id: 'sprint', label: 'Sprint', icon: BoltIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-20 bg-surface border-r border-border transition-all duration-300 ease-in-out">
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-center">
        <div className="bg-primary-container text-on-primary-container p-3 rounded-xl">
          <DrutIcon className="h-6 w-6" />
        </div>
      </div>

      {/* Navigation Rail */}
      <div className="flex-1 flex flex-col items-center space-y-4 py-8">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            {...item}
            isActive={currentPage === item.id}
            onClick={() => setCurrentPage(item.id)}
          />
        ))}
      </div>

      {/* User Profile */}
      <div className="p-4 mt-auto flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full hover:bg-surface-variant p-1 transition-colors">
              <Avatar email={user?.email || 'User'} src={user?.user_metadata?.avatar_url} className="h-10 w-10 rounded-full border border-border" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 ml-2 rounded-xl shadow-elevation-2 border-none p-2 bg-surface">
            <div className="px-3 py-2 border-b border-border mb-2">
              <p className="text-sm font-bold text-on-surface truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={onLogout} className="rounded-lg cursor-pointer text-error hover:bg-error-container hover:text-on-error-container p-3 transition-colors">
              <LogoutIcon className="mr-3 h-5 w-5" />
              <span className="font-medium">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{
  id: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-center gap-1 w-full"
    title={label}
  >
    <div className={`
      flex items-center justify-center w-14 h-8 rounded-full transition-all duration-200
      ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant group-hover:bg-surface-variant'}
    `}>
      <Icon className="h-6 w-6" />
    </div>
    <span className={`text-[11px] font-medium tracking-wide ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
      {label}
    </span>
  </button>
);