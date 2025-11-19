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
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-20 bg-white border-r border-border/40 transition-all duration-300 ease-in-out">
      {/* Logo Section */}
      <div className="flex h-24 items-center justify-center">
        <div className="text-primary">
          <DrutIcon className="h-8 w-8" />
        </div>
      </div>

      {/* Navigation Rail */}
      <div className="flex-1 flex flex-col items-center space-y-8 py-8">
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
      <div className="p-4 mt-auto flex justify-center mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
              <Avatar email={user?.email || 'User'} src={user?.user_metadata?.avatar_url} className="h-10 w-10 rounded-full border border-border" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 ml-2 rounded-2xl shadow-soft border-none p-2 bg-white">
            <div className="px-3 py-2 border-b border-gray-100 mb-2">
              <p className="text-sm font-bold text-foreground truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={onLogout} className="rounded-xl cursor-pointer text-red-500 hover:bg-red-50 p-3 transition-colors">
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
    className="group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200"
    title={label}
  >
    <Icon className={`h-6 w-6 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary/70'}`} />
    {isActive && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
    )}
  </button>
);