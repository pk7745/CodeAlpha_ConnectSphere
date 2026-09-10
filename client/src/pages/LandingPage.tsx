import React from 'react';
import { Navbar } from '../components/common/Navbar';
import { Video, Shield, Share2, PenTool, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30 dark:opacity-20 pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand-600 to-violet-500 blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/80 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              CodeAlpha Full Stack Project — Task 4
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
              Meet. Collaborate.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-500 to-purple-600 dark:from-brand-400 dark:via-indigo-300 dark:to-purple-400">
                Get Things Done.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              A high-performance real-time communication platform combining WebRTC HD multi-user video calling, interactive collaborative whiteboard, secure file exchange, and unified workspace action items.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#get-started"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
              >
                Start a Meeting
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#join"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 font-semibold transition-all"
              >
                Join with Code
              </a>
            </div>

            {/* Feature Pills */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-left">
                <Video className="w-6 h-6 text-brand-500 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Multi-User Video</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Native WebRTC mesh video with screen share</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-left">
                <PenTool className="w-6 h-6 text-indigo-500 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Whiteboard</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-user real-time drawing sync</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-left">
                <Share2 className="w-6 h-6 text-purple-500 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">File Sharing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Validated secure in-meeting file distribution</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-left">
                <Shield className="w-6 h-6 text-emerald-500 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Secure & Encrypted</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">DTLS-SRTP media & JWT authenticated</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ConnectSphere &copy; 2026 CodeAlpha Full Stack Internship Task 4</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Phase 1 Foundation Operational
          </span>
        </div>
      </footer>
    </div>
  );
};
