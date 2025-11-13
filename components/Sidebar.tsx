



import React from 'react';
import { User } from '../types';
import { useSidebar } from './ui/AppShell';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';
import { Separator } from './ui/Separator';
import { DrutIcon, MoreHorizontalIcon, UserIcon, LayoutDashboardIcon, PracticeIcon, LogoutIcon } from './icons/Icons';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
}

const NavItem: React.FC<{
    id: string;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}> = ({ id, label, icon: Icon, isActive, isCollapsed, onClick }) => (
    <Button
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}
        onClick={onClick}
        aria-label={label}
    >
        <Icon className={isCollapsed ? 'h-5 w-5' : 'mr-2 h-5 w-5'} />
        {!isCollapsed && label}
    </Button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const { isCollapsed } = useSidebar();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'practice', label: 'Practice', icon: PracticeIcon },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
      data-collapsible={isCollapsed ? 'true' : 'false'}
    >
      <div className="flex h-16 items-center border-b px-6">
         <a href="#" className="flex items-center gap-2 font-semibold">
            <DrutIcon className="h-6 w-6" />
            {!isCollapsed && <span>Drut</span>}
        </a>
      </div>
      <nav className="flex-1 flex flex-col space-y-2 p-4">
        {navItems.map(item => (
            <NavItem 
                key={item.id}
                {...item}
                isActive={currentPage === item.id}
                isCollapsed={isCollapsed}
                onClick={() => setCurrentPage(item.id)}
            />
        ))}
      </nav>
      <div className="mt-auto p-4 border-t">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`w-full p-2 h-auto ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                    <div className="flex items-center gap-3">
                        <Avatar email={user?.email || 'User'} src={user?.user_metadata?.avatar_url} />
                        {!isCollapsed && (
                            <div className="flex flex-col items-start text-left overflow-hidden">
                                <span className="text-sm font-medium leading-none truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
                                <span className="text-xs text-muted-foreground leading-none truncate">{user?.email}</span>
                            </div>
                        )}
                        {!isCollapsed && <MoreHorizontalIcon className="ml-auto h-4 w-4 flex-shrink-0" />}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                <DropdownMenuItem onClick={() => setCurrentPage('profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                    <LogoutIcon className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};