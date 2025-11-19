import React from 'react';
import { User } from '../types';
import { useSidebar } from './ui/AppShell';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';
import { Separator } from './ui/Separator';
import { DrutIcon, MoreHorizontalIcon, UserIcon, LayoutDashboardIcon, PracticeIcon, LogoutIcon, BoltIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const { isCollapsed } = useSidebar();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'practice', label: 'Practice', icon: PracticeIcon },
    { id: 'sprint', label: 'Sprint', icon: BoltIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white shadow-soft transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24' : 'w-72'}`}
      data-collapsible={isCollapsed ? 'true' : 'false'}
    >
      {/* Logo Section */}
      <div className="flex h-24 items-center px-8">
        <a href="#" className="flex items-center gap-3 font-bold text-xl text-foreground">
          <div className="bg-primary text-white p-2 rounded-xl">
            <DrutIcon className="h-6 w-6" />
          </div>
          {!isCollapsed && <span>Drut</span>}
        </a>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col space-y-6 px-6 py-4">
        <div className="space-y-2">
          {!isCollapsed && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-4">Overview</p>}
          {navItems.map(item => (
            <NavItem
              key={item.id}
              {...item}
              isActive={currentPage === item.id}
              isCollapsed={isCollapsed}
              onClick={() => setCurrentPage(item.id)}
            />
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-6 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors hover:bg-gray-50 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
              <Avatar email={user?.email || 'User'} src={user?.user_metadata?.avatar_url} className="h-10 w-10 rounded-full border-2 border-white shadow-sm" />
              {!isCollapsed && (
                <div className="flex flex-col items-start text-left overflow-hidden">
                  <span className="text-sm font-bold text-foreground leading-none truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
                  <span className="text-xs text-gray-400 mt-1 leading-none truncate">Free Plan</span>
                </div>
              )}
              {!isCollapsed && <MoreHorizontalIcon className="ml-auto h-5 w-5 text-gray-400" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 rounded-2xl shadow-soft border-none p-2">
            <DropdownMenuItem onClick={onLogout} className="rounded-xl cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 p-3">
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
  isCollapsed: boolean;
  onClick: () => void;
}> = ({ id, label, icon: Icon, isActive, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`
          w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group
          ${isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/30'
        : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
      }
          ${isCollapsed ? 'justify-center' : ''}
        `}
    title={label}
  >
    <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
    {!isCollapsed && <span className="font-medium text-sm">{label}</span>}
  </button>
);