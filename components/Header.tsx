
import React from 'react';
import { SidebarTrigger } from './ui/AppShell';
import { Separator } from './ui/Separator';
import { PayMeIcon } from './icons/Icons';

export const Header: React.FC<{}> = () => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6 hidden lg:flex" />
        <a href="/" className="flex items-center gap-2">
          <PayMeIcon className="h-8 w-8 text-pay-green-dark" />
          <span className="hidden sm:inline text-xl font-bold tracking-tight">PayMe App</span>
        </a>
      </div>
    </header>
  );
};