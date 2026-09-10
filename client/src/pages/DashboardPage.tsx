import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { Video, Plus, Shield, LogOut, Sparkles, Clock, Calendar } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-700 p-8 sm:p-10 text-white shadow-xl shadow-brand-500/15 mb-10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Authenticated Session Active
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.name || 'Collaborator'}!
              </h1>
              <p className="mt-2 text-brand-100 text-sm sm:text-base max-w-xl">
                Ready to collaborate? Start an instant meeting, schedule upcoming sessions, or review your workspaces.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                New Meeting
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm backdrop-blur-sm transition-all"
              >
                <Video className="w-4 h-4" />
                Join with Code
              </button>
            </div>
          </div>
        </div>

        {/* User Profile & Workspace Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* User Profile Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-brand-500/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {user?.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Member Since
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formattedDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Account Security
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  JWT Protected
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={logout}
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Quick Metrics / Status Cards */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Phase 2 Verification
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                100% Passed
              </span>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              Authentication Active
            </h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Your JWT session is cryptographically validated and attached to your client requests.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Token expiration: 7 days
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Next Step
              </span>
              <span className="px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold">
                Phase 3
              </span>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              Meeting Engine
            </h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Create meetings, generate secure room codes, and manage participants with host/participant authorization.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        ConnectSphere &copy; 2026 — CodeAlpha Full Stack Internship Task 4
      </footer>
    </div>
  );
};