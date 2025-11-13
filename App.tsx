
import React from 'react';
import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Practice } from './components/Practice';
import { Sidebar } from './components/Sidebar';
import { preloadFirstQuestion } from './services/preloaderService';
import { User } from './types';
import { getCurrentUser, onAuthStateChange, logout as authLogout } from './services/authService';
import { AuthPage } from './components/AuthPage';
import { HealthStatus, runtimeHealth } from './lib/health';
import { log } from './lib/log';
import { SidebarProvider, SidebarInset } from './components/ui/AppShell';
import { Profile } from './components/Profile';
import { LandingPage } from './components/LandingPage';


// In a real Next.js app, this would be process.env.NEXT_PUBLIC_DEBUG
const IS_DEBUG_MODE = true; // Set to true to see the debug chip

const HealthChip: React.FC<{ status: HealthStatus }> = ({ status }) => (
  <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 shadow-lg z-50">
    <p>
      <span className={status.devtoolsPatched ? 'text-green-400' : 'text-red-400'}>●</span> DevTools Patched
    </p>
    <p>
      <span className={status.supabaseReady ? 'text-green-400' : 'text-red-400'}>●</span> Supabase Ready
    </p>
     <p>
      <span className={status.monacoLazy ? 'text-green-400' : 'text-red-400'}>●</span> Monaco Lazy
    </p>
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (IS_DEBUG_MODE) {
        const status = runtimeHealth();
        setHealthStatus(status);
        log.info('Runtime Health:', JSON.stringify(status, null, 2));
    }
    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            log.error("Error checking user session:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    checkUser();

    const { data: authListener } = onAuthStateChange((_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (!sessionUser) {
            setShowAuth(false);
        }
    });

    return () => {
        authListener?.unsubscribe();
    };
  }, []);


  // Preload the first question on app startup if user is logged in
  useEffect(() => {
    if (user) {
        preloadFirstQuestion();
    }
  }, [user]);


  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    setShowAuth(false);
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setCurrentPage('dashboard'); // Reset to dashboard after logout
    setShowAuth(false);
  };

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  if (!user) {
    if (showAuth) {
        return <AuthPage onLoginSuccess={handleLoginSuccess} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  return (
    <SidebarProvider>
        <div className="bg-muted/40">
            <Sidebar 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage}
              user={user}
              onLogout={handleLogout}
            />
            <SidebarInset>
                <Header />
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <div className="container mx-auto px-0">
                        {currentPage === 'dashboard' && <Dashboard />}
                        {currentPage === 'practice' && <Practice />}
                        {currentPage === 'profile' && <Profile />}
                    </div>
                </main>
                <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-card">
                    © {new Date().getFullYear()} PayMe App. All rights reserved.
                </footer>
            </SidebarInset>
        </div>
        {IS_DEBUG_MODE && healthStatus && <HealthChip status={healthStatus} />}
    </SidebarProvider>
  );
}

export default App;