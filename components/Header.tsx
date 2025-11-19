import React from 'react';
import { SidebarTrigger } from './ui/AppShell';

export const Header: React.FC<{}> = () => {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center bg-background/80 backdrop-blur-md px-8 transition-all duration-200">
      <div className="flex w-full items-center justify-between">

        {/* Left: Search (Minimalist) */}
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          <div className="flex items-center gap-3 text-gray-400 hover:text-gray-600 transition-colors cursor-text group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search something..."
              className="bg-transparent outline-none text-sm w-64 placeholder-gray-400 text-foreground"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Royal"
              alt="Profile"
              className="h-10 w-10 rounded-full border-2 border-white shadow-sm bg-gray-100"
            />
            <div className="hidden md:block">
              <p className="text-sm font-bold text-foreground leading-none">Royal Parvej</p>
              <p className="text-xs text-gray-400 mt-1 leading-none">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};