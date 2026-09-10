import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserMeetingsApi, endMeetingApi } from '../services/meetingApi';
import { Meeting } from '../types/meeting';
import { Navbar } from '../components/common/Navbar';
import { CreateMeetingModal } from '../components/dashboard/CreateMeetingModal';
import { JoinMeetingModal } from '../components/dashboard/JoinMeetingModal';
import { MeetingSummaryModal } from '../components/dashboard/MeetingSummaryModal';
import { MeetingCard } from '../components/dashboard/MeetingCard';
import {
  Video,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Calendar,
  Shield,
  Layers,
  LogOut,
  AlertCircle,
  Radio,
} from 'lucide-react';

type FilterTab = 'ALL' | 'ACTIVE' | 'ENDED';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [summaryMeetingId, setSummaryMeetingId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserMeetingsApi();
      setMeetings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleEndMeeting = async (id: string) => {
    try {
      await endMeetingApi(id);
      fetchMeetings();
    } catch (err: any) {
      alert(err.message || 'Failed to end meeting');
    }
  };

  const handleMeetingCreated = (newMeeting: Meeting) => {
    setMeetings((prev) => [newMeeting, ...prev]);
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.roomCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTab === 'ACTIVE') return m.status === 'ACTIVE';
      if (activeTab === 'ENDED') return m.status === 'ENDED';
      return true;
    });
  }, [meetings, searchQuery, activeTab]);

  const activeCount = useMemo(
    () => meetings.filter((m) => m.status === 'ACTIVE').length,
    [meetings]
  );
  const hostedCount = useMemo(
    () => meetings.filter((m) => m.isHost).length,
    [meetings]
  );

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-700 p-8 sm:p-10 text-white shadow-xl shadow-brand-500/15 mb-10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Collaborative Meeting Dashboard
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Collaborator'}!
              </h1>
              <p className="mt-2 text-brand-100 text-sm sm:text-base">
                Create real-time encrypted rooms, share room codes with your team, or review past sessions.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                New Meeting
              </button>
              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm backdrop-blur-sm transition-all"
              >
                <Video className="w-4 h-4" />
                Join with Code
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Meetings
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {meetings.length}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Active Now
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {activeCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Hosted by You
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {hostedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Meeting Directory Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main List Area (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Meeting History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your created rooms and joined sessions
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or code..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchMeetings}
                  disabled={isLoading}
                  title="Refresh list"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              {(['ALL', 'ACTIVE', 'ENDED'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab === 'ALL' ? 'All Sessions' : tab === 'ACTIVE' ? 'Active' : 'Completed'}
                </button>
              ))}
            </div>

            {/* Meetings Cards or States */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 animate-pulse p-5"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#131b2e] border border-rose-200 dark:border-rose-900/60 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Failed to Load Meetings
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  {error}
                </p>
                <button
                  onClick={fetchMeetings}
                  type="button"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-sm"
                >
                  Retry
                </button>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  No meetings found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-6">
                  {searchQuery
                    ? 'No sessions matched your search criteria.'
                    : 'Start your first instant meeting or join with a room code to get started.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Meeting
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onEndMeeting={handleEndMeeting}
                    onViewSummary={(id) => setSummaryMeetingId(id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar: Profile & Quick Info (1 col) */}
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-brand-500/20">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {user?.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    Member Since
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {memberSince}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    Security
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    JWT Active
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400">
                CodeAlpha Task 4 Progress
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white mt-1 mb-2">
                Phase 3: Room Engine
              </h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                Unique room codes, authorization barriers, and session summaries are fully verified in the SQLite database layer.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onMeetingCreated={handleMeetingCreated}
        defaultTitle={`${user?.name?.split(' ')[0] || 'Team'}'s Meeting`}
      />

      <JoinMeetingModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      <MeetingSummaryModal
        isOpen={!!summaryMeetingId}
        meetingId={summaryMeetingId}
        onClose={() => setSummaryMeetingId(null)}
      />

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        ConnectSphere &copy; 2026 — CodeAlpha Full Stack Internship Task 4
      </footer>
    </div>
  );
};