import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Practice } from './components/Practice';
import { Sidebar } from './components/Sidebar';
import { preloadFirstQuestion } from './services/preloaderService';
import { User } from './types';
import { getCurrentUser, logout as authLogout } from './services/authService';
import { AuthPage } from './components/AuthPage';

export interface PersonalizedTopic {
    topic: string;
    subTopic: string;
}

function App() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [personalizedSessionTopics, setPersonalizedSessionTopics] = useState<PersonalizedTopic[] | null>(null);

  // Preload the first question on app startup if user is logged in
  useEffect(() => {
    if (user) {
        preloadFirstQuestion();
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Automatically collapse on practice page, expand on dashboard for desktop
    if (!isMobile) {
      if (currentPage === 'practice') {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    }
  }, [currentPage, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    authLogout();
    setUser(null);
    setCurrentPage('dashboard'); // Reset to dashboard after logout
  };
  
  const handleStartPersonalizedSession = (topics: PersonalizedTopic[]) => {
      setPersonalizedSessionTopics(topics);
      setCurrentPage('practice');
  };
  
  const handleEndPersonalizedSession = () => {
      setPersonalizedSessionTopics(null);
      setCurrentPage('dashboard');
  };

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/50">
      <Header user={user} onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isPersonalizedSessionActive={!!personalizedSessionTopics}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="container mx-auto px-0">
            {currentPage === 'dashboard' && <Dashboard onStartPersonalizedSession={handleStartPersonalizedSession} />}
            {currentPage === 'practice' && (
                <Practice 
                    personalizedTopics={personalizedSessionTopics}
                    onEndPersonalizedSession={handleEndPersonalizedSession}
                />
            )}
          </div>
        </main>
      </div>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} Drut. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
