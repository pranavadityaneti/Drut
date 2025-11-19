
import React from 'react';
import { SidebarTrigger } from './ui/AppShell';
import { Separator } from './ui/Separator';
import { DrutIcon } from './icons/Icons';

export const Header: React.FC<{}> = () => {
  return (
    <header className="sticky top-0 z-30 flex h-24 items-center bg-background px-8">
      <div className="flex w-full items-center justify-between">

        {/* Left: Search Bar */}
        <div className="flex items-center gap-6 flex-1">
          <SidebarTrigger />
          <div className="hidden md:flex items-center w-full max-w-md bg-white rounded-full px-6 py-3 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search your course..."
              className="ml-3 flex-1 bg-transparent outline-none text-sm text-foreground placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          <button className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <button className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-3 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200 ml-2">
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">Jason Ranti</p>
              <p className="text-xs text-gray-400">Student</p>
            </div>
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jason"
              alt="Profile"
              className="h-10 w-10 rounded-full border-2 border-white shadow-sm bg-gray-100"
            />
          </div>
        </div>
      </div>
    </header>
  );
};