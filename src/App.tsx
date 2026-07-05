import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, UserCheck, Shield } from 'lucide-react';
import RegistrationForm from './components/RegistrationForm.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<'register' | 'admin'>('register');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isLoadingCsrf, setIsLoadingCsrf] = useState(true);

  // Load secure CSRF Token on startup
  const fetchCsrfToken = async () => {
    try {
      setIsLoadingCsrf(true);
      const res = await fetch('/api/csrf-token');
      const data = await res.json();
      setCsrfToken(data.csrfToken);
    } catch (err) {
      console.error('Failed to load CSRF safety token from backend:', err);
    } finally {
      setIsLoadingCsrf(false);
    }
  };

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  return (
    <div id="main_app_layout" className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col antialiased">
      
      {/* Premium Header Nav Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 print:hidden shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('register')} 
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-emerald-700 transition-all">
              ER
            </div>
            <div>
              <span className="font-sans font-bold text-slate-900 tracking-tight text-sm sm:text-base">
                Electronic Register
              </span>
              <span className="text-[10px] text-slate-400 block font-medium -mt-1">National Candidate Desk</span>
            </div>
          </div>

          <nav className="flex items-center space-x-1.5">
            <button
              type="button"
              id="nav_register"
              onClick={() => setCurrentView('register')}
              className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'register'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100/80'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Register Candidate</span>
              <span className="sm:hidden">Register</span>
            </button>
            <button
              type="button"
              id="nav_admin"
              onClick={() => setCurrentView('admin')}
              className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 print:py-0 print:px-0">
        <AnimatePresence mode="wait">
          {isLoadingCsrf ? (
            <motion.div
              key="loading-csrf"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 space-y-3"
            >
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider font-mono uppercase">
                Establishing CSRF Safety handshake...
              </span>
            </motion.div>
          ) : (
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {currentView === 'register' ? (
                <RegistrationForm 
                  csrfToken={csrfToken} 
                  onViewAdmin={() => setCurrentView('admin')} 
                />
              ) : (
                <AdminDashboard 
                  csrfToken={csrfToken} 
                  onBackToForm={() => setCurrentView('register')} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Simple elegant page footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 font-medium print:hidden shadow-xs shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <p>© 2026 Electronic Candidate Registration Desk. All Rights Reserved.</p>
          <div className="flex space-x-3.5 font-semibold text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer">Security Protocol</span>
            <span>•</span>
            <span className="hover:text-slate-800 cursor-pointer">Privacy Charter</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
