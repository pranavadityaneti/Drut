
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Practice } from './components/Practice';
import { Sidebar } from './components/Sidebar';
import { preloadFirstQuestion } from './services/preloaderService';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Preload the first question on app startup
  useEffect(() => {
    preloadFirstQuestion();
  }, []);

  useEffect(() => {
    // Automatically collapse on practice page, expand on dashboard
    if (currentPage === 'practice') {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [currentPage]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary/50">
      <Header />
      <div className="flex flex-1 container mx-auto">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <main className="flex-1 p-4 md:p-6">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'practice' && <Practice />}
        </main>
      </div>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Drut. All rights reserved.
      </footer>
    </div>
  );
}

export default App;