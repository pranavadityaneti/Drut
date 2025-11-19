import React from 'react';
import { SidebarTrigger } from './ui/AppShell';

export const Header: React.FC<{}> = () => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center bg-surface px-4 transition-shadow duration-200">
      <div className="flex w-full items-center justify-between">

        {/* Left: Title / Navigation */}
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-title-large font-normal text-on-surface">Dashboard</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button className="p-3 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button className="p-3 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors relative" aria-label="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-3 right-3 h-2 w-2 bg-error rounded-full"></span>
          </button>

          <div className="ml-2">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jason"
              alt="Profile"
              className="h-8 w-8 rounded-full border border-border bg-surface-variant"
            />
          </div>
        </div>
      </div>
    </header>
  );
};