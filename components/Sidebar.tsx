import React, { useState } from 'react';
import { User } from '../types';
import { UserIcon, LayoutDashboardIcon, PracticeIcon, BoltIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'practice', label: 'Practice', icon: PracticeIcon },
    { id: 'sprint', label: 'Sprint', icon: BoltIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-border/40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo Section */}
      <div className="flex h-24 items-center px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Drut" className="h-8" />
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation Rail */}
      <div className="flex-1 flex flex-col space-y-2 py-4 px-3">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            {...item}
            isActive={currentPage === item.id}
            onClick={() => setCurrentPage(item.id)}
            isCollapsed={isCollapsed}
          />
        ))}
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
  isCollapsed: boolean;
}> = ({ label, icon: Icon, isActive, onClick, isCollapsed }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
      } ${isCollapsed ? 'justify-center' : ''}`}
    title={isCollapsed ? label : ''}
  >
    <Icon className={`h-6 w-6 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary/70'}`} />
    {!isCollapsed && <span className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>{label}</span>}
    {isActive && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
    )}
  </button>
);