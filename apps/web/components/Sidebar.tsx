import React, { useState } from 'react';
import { cn } from '@drut/shared';
import { User } from '@drut/shared';
import {
  LayoutGrid,  // Minimal Dashboard
  Target,      // Precise Practice
  Timer,       // Sprint
  BarChart2,   // Analytics
  FileText,    // Papers
  HelpCircle,  // FAQs
  MessageSquare, // Contact
  User as UserIcon,
  Shield,      // Admin
  Upload,
  ChevronLeft
} from 'lucide-react';
import { Button } from './ui/Button';

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

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Admin Detection
  const isAdmin = user?.email === 'pranav.n@ideaye.in';

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
      ]
    },
    {
      title: 'Learning',
      items: [
        { id: 'practice', label: 'Practice', icon: Target },
        { id: 'sprint', label: 'Sprints', icon: Timer },
        { id: 'previous_papers', label: 'Previous Papers', icon: FileText },
      ]
    },
    {
      title: 'Help & Settings',
      items: [
        { id: 'profile', label: 'Profile', icon: UserIcon },
        ...(isAdmin ? [
          { id: 'admin', label: 'Admin Dashboard', icon: Shield }
        ] : []),
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        { id: 'contact', label: 'Contact', icon: MessageSquare },
      ]
    }
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out font-sans",
        isCollapsed ? 'w-[72px]' : 'w-72'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-between px-6 mb-2">
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
            "h-8 w-8 transition-transform text-muted-foreground hover:text-foreground",
            isCollapsed && "mx-auto rotate-180"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-0 space-y-6 scrollbar-hide">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {!isCollapsed && (
              <h4 className="px-6 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map(item => (
                <NavItemComponent
                  key={item.id}
                  {...item}
                  isActive={currentPage === item.id}
                  onClick={() => setCurrentPage(item.id)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

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
      "w-full group relative flex items-center gap-4 px-6 py-3 text-sm transition-all duration-200",
      isActive
        ? "text-slate-900 font-bold bg-gradient-to-r from-[#5cbb21]/10 to-transparent"
        : "text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-50",
      isCollapsed && "justify-center px-2 py-3"
    )}
    title={isCollapsed ? label : undefined}
  >
    {/* Active Indicator (Left Gradient Bar) */}
    {isActive && (
      <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#5cbb21] to-[#cbe856] shadow-[0_0_10px_rgba(92,187,33,0.3)]"></div>
    )}

    <Icon className={cn(
      "h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200",
      isActive ? "text-[#5cbb21]" : "text-slate-400 group-hover:text-slate-600"
    )} />

    {!isCollapsed && <span className="tracking-tight">{label}</span>}
  </button>
);