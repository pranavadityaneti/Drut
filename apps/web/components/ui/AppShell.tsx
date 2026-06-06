import React, { createContext, useContext } from 'react';

/**
 * AppShell — editorial refresh.
 *
 * Thin layout wrapper around the sidebar + main content. Sidebar is w-72 (288px),
 * so the inset margin matches. Background is warm paper from the new tokens.
 * A top halftone bleed div is rendered above the main content for editorial chrome.
 */

const SidebarContext = createContext<undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarContext.Provider value={undefined}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  return {};
};

export const SidebarInset: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex flex-col min-h-screen transition-all duration-300 ease-in-out lg:ml-72 ml-0 bg-background">
      {/* Editorial halftone bleed at top of canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-halftone z-0"
      />
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
};

// Deprecated; kept to prevent breaking imports if referenced elsewhere.
export const SidebarTrigger: React.FC<{ className?: string }> = () => {
  return null;
};
