import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { User } from '../types';
import {
  LayoutDashboard,
  Dumbbell,
  Zap,
  User as UserIcon,
  Upload,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import { Button } from './ui/Button';
import { Separator } from './ui/separator-new';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
        isCollapsed ? 'w-[72px]' : 'w-80'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-3">
          {!isCollapsed && (
            <img src="/brand-logo.png" alt="Drut" className="h-8" />
          )}
          {isCollapsed && (
            <span className="font-bold text-2xl mx-auto" style={{ color: '#5cbb21' }}>D</span>
          )}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "h-8 w-8 transition-transform",
            isCollapsed && "mx-auto rotate-180"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 p-4">
        {allNavItems.map(item => (
          <NavItemComponent
            key={item.id}
            {...item}
            isActive={currentPage === item.id}
            onClick={() => setCurrentPage(item.id)}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer Removed as requested */}
    </aside>
  );
};

const NavItemComponent: React.FC<{
  id: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({ label, icon: Icon, isActive, onClick, isCollapsed }) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative flex items-center gap-4 px-4 py-3.5 rounded-lg text-base font-medium transition-all duration-200",
      isActive
        ? "text-white shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      isCollapsed && "justify-center px-2"
    )}
    style={isActive ? { backgroundColor: '#5cbb21' } : undefined}
    title={isCollapsed ? label : undefined}
  >
    <Icon className={cn(
      "h-6 w-6 flex-shrink-0 transition-colors",
      isActive ? "text-white" : "group-hover:text-[#5cbb21]"
    )} />
    {!isCollapsed && <span>{label}</span>}
  </button>
);