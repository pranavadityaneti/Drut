import React, { useState } from 'react';
import { cn } from '@drut/shared';
import { User } from '@drut/shared';
import { isAdminEmail } from '@drut/shared';
import {
  LayoutGrid,
  Target,
  Timer,
  BarChart2,
  FileText,
  HelpCircle,
  MessageSquare,
  User as UserIcon,
  Shield,
  ChevronLeft,
  ChevronDown,
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

  // Admin Detection — single client source of truth (@drut/shared isAdminEmail).
  const isAdmin = isAdminEmail(user?.email);

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
          { id: 'admin', label: 'Admin', icon: Shield }
        ] : []),
        { id: 'help-support', label: 'Help & Support', icon: HelpCircle },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        { id: 'contact', label: 'Contact', icon: MessageSquare },
      ]
    }
  ];

  // Initial for the collapsed-state avatar chip.
  const userInitial = (user?.user_metadata?.full_name || user?.email || 'D')[0]?.toUpperCase() ?? 'D';

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-[var(--color-card)] transition-all duration-300 ease-in-out font-sans",
        "ring-hairline-strong",
        isCollapsed ? 'w-[72px]' : 'w-72'
      )}
    >
      {/* === Workspace switcher === */}
      <div className="flex h-16 items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo chip */}
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-ink-1)] text-white font-bold text-sm shrink-0"
            title="Drut"
          >
            D
          </span>
          {!isCollapsed && (
            <>
              <span className="font-semibold text-[15px] text-[var(--color-ink-1)] truncate tracking-tight">
                Drut
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--color-ink-3)] shrink-0" />
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "h-7 w-7 text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-muted)] shrink-0",
            isCollapsed && "rotate-180"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* === Profile cluster (own avatar + identity) === */}
      {!isCollapsed && user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[11px] font-semibold text-[var(--color-ink-2)] ring-2 ring-white shrink-0">
              {userInitial}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--color-ink-2)] truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* === Navigation === */}
      <nav className="flex-1 overflow-y-auto py-2 px-0 space-y-5 scrollbar-hide">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {!isCollapsed && (
              <h4 className="label-uppercase px-5 mb-1.5">
                {group.title}
              </h4>
            )}
            <div className="space-y-0.5 px-2">
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
      "w-full group relative flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-[10px] transition-colors duration-150",
      isActive
        ? "nav-pill-active"
        : "text-[var(--color-ink-3)] font-medium hover:text-[var(--color-ink-1)] hover:bg-[var(--color-muted)]",
      isCollapsed && "justify-center px-2 py-2.5"
    )}
    title={isCollapsed ? label : undefined}
  >
    {/* Leading dot on active item replaces the old gradient bar */}
    {isActive && !isCollapsed && (
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
    )}

    <Icon className={cn(
      "h-[17px] w-[17px] flex-shrink-0 transition-colors duration-150",
      isActive ? "text-[var(--color-ink-1)]" : "text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-1)]"
    )} />

    {!isCollapsed && <span className="tracking-tight truncate">{label}</span>}
  </button>
);
