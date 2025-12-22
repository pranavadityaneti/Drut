
import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Practice } from './components/Practice';
import { Sprint } from './components/Sprint';
import { Sidebar } from './components/Sidebar';
import { preloadFirstQuestion } from './services/preloaderService';
import { User } from './types';
import { getCurrentUser, onAuthStateChange, logout as authLogout } from './services/authService';
import { AuthPage } from './components/AuthPage';
import { HealthStatus, runtimeHealth } from './lib/health';
import { log } from './lib/log';
import { SidebarProvider, SidebarInset } from './components/ui/AppShell';
import { Profile } from './components/Profile';
import { WaitlistModern } from './components/WaitlistModern';
import { WaitlistClassic } from './components/WaitlistClassic';
import { AdminIngestion } from './components/AdminIngestion';
import { BulkIngest } from './components/BulkIngest';
import { ModalProvider } from './components/ui/Modal';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsAndConditions } from './components/legal/TermsAndConditions';


// In a real Next.js app, this would be process.env.NEXT_PUBLIC_DEBUG
const IS_DEBUG_MODE = false; // Set to true to see the debug chip

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
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

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
    });

    return () => {
      authListener?.subscription?.unsubscribe();
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
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
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

  return (
    <ModalProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            user ? <Navigate to="/dashboard" replace /> : <WaitlistClassic onGetStarted={() => window.location.href = '/login'} />
          } />
          <Route path="/classic" element={
            user ? <Navigate to="/dashboard" replace /> : <WaitlistClassic onGetStarted={() => window.location.href = '/login'} />
          } />
          <Route path="/login" element={
            user ? <Navigate to="/dashboard" replace /> : <AuthPage onLoginSuccess={handleLoginSuccess} defaultMode="login" />
          } />
          <Route path="/signup" element={
            user ? <Navigate to="/dashboard" replace /> : <AuthPage onLoginSuccess={handleLoginSuccess} defaultMode="signup" />
          } />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="dashboard" /> : <Navigate to="/login" replace />
          } />
          <Route path="/practice" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="practice" /> : <Navigate to="/login" replace />
          } />
          <Route path="/sprint" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="sprint" /> : <Navigate to="/login" replace />
          } />
          <Route path="/profile" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="profile" /> : <Navigate to="/login" replace />
          } />
          <Route path="/admin/ingest" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="admin-ingest" /> : <Navigate to="/login" replace />
          } />
          <Route path="/admin/bulk" element={
            user ? <AuthenticatedLayout user={user} onLogout={handleLogout} page="admin-bulk" /> : <Navigate to="/login" replace />
          } />

          {/* Legal routes */}
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/termsandconditions" element={<TermsAndConditions />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {IS_DEBUG_MODE && healthStatus && <HealthChip status={healthStatus} />}
      </Router>
    </ModalProvider>
  )
}

const AuthenticatedLayout: React.FC<{
  user: User;
  onLogout: () => void;
  page: 'dashboard' | 'practice' | 'sprint' | 'profile' | 'admin-ingest' | 'admin-bulk';
}> = ({ user, onLogout, page }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [useMockData, setUseMockData] = useState(false);

  const setCurrentPage = (newPage: string) => {
    navigate(`/${newPage}`);
  };

  // Determine current page from URL
  const currentPage = location.pathname.substring(1) || 'dashboard';

  return (
    <SidebarProvider>
      <div className="bg-muted/40">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          user={user}
          onLogout={onLogout}
        />
        <SidebarInset>
          <Header
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onLogout={onLogout}
            useMockData={useMockData}
            setUseMockData={setUseMockData}
          />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full min-w-0">
            <div className="container mx-auto px-0 max-w-full">
              {page === 'dashboard' && <Dashboard />}
              {page === 'practice' && <Practice />}
              {page === 'sprint' && <Sprint />}
              {page === 'profile' && <Profile />}
              {page === 'admin-ingest' && <AdminIngestion />}
              {page === 'admin-bulk' && <BulkIngest />}
            </div>
          </main>
          <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-card">
            © {new Date().getFullYear()} Drut. All rights reserved.
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default App;

