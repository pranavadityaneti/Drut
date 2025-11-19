


import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from './Button';

const ChevronsLeftIcon = ({ className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${className}`}><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
);

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    // Prevent expanding on mobile viewports
    if (isMobile) {
      return;
    }
    setIsCollapsed(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarInset: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  return (
    <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-24' : 'lg:ml-72'} ml-0`}>
      {children}
    </div>
  );
};

export const SidebarTrigger: React.FC<{ className?: string }> = ({ className }) => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button onClick={toggleSidebar} variant="ghost" size="icon" className={`shrink-0 hidden lg:flex ${className}`} aria-label="Toggle sidebar">
      <ChevronsLeftIcon className="h-5 w-5" />
    </Button>
  );
}
