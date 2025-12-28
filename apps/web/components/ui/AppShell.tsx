


import React, { createContext, useContext } from 'react';

// Simplified Context since we don't have collapse state anymore
const SidebarContext = createContext<undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarContext.Provider value={undefined}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  return {}; // No-op for now
};

export const SidebarInset: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen transition-all duration-300 ease-in-out lg:ml-80 ml-0 bg-background">
      {children}
    </div>
  );
};

// Deprecated but kept to prevent breaking imports if used elsewhere, returning null
export const SidebarTrigger: React.FC<{ className?: string }> = () => {
  return null;
}
