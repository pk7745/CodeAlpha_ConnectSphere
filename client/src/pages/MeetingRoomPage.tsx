import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMeetingSocket } from '../hooks/useMeetingSocket';
import { Navbar } from '../components/common/Navbar';
import {
  Video,
  Copy,
  Check,
  ArrowLeft,
  Users,
  Shield,
  Radio,
  LogOut,
  Crown,
  Loader2,
  AlertCircle,
  Square,
  Sparkles,
} from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    meeting,
    participants,
    connectionState,
    isHost,
    isLoading,
    error,
    meetingEnded,
    leaveMeeting,
    endMeeting,
  } = useMeetingSocket(roomCode);

  const [copied, setCopied] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleLeave = async () => {
    await leaveMeeting();
    navigate('/dashboard');
  };

  const handleEnd = async () => {
    if (!window.confirm('Are you sure you want to end this meeting for all participants?')) {
      return;
    }
    setIsEnding(true);
    try {
      await endMeeting();
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to end meeting');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {meeting?.title || 'ConnectSphere Room'}
                </h1>
                {isHost && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    <Crown className="w-3 h-3 text-amber-500" />
                    Host
                  </span>
                )}
              </div>

              {/* Room Code Badge */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Connection State & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Connection Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                connectionState === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : connectionState === 'reconnecting'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  connectionState === 'connected' ? 'animate-pulse text-emerald-500' : 'text-amber-500'
                }`}
              />
              <span className="capitalize">{connectionState}</span>
            </div>

            {/* Leave Room Button */}
            <button
              type="button"
              onClick={handleLeave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>

            {/* Host End Button */}
            {isHost && (
              <button
                type="button"
                onClick={handleEnd}
                disabled={isEnding}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                End for All
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-500">Connecting to real-time signaling room...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-auto p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-rose-200 dark:border-rose-900/60 text-center shadow-xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Failed to Join Meeting
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        ) : (
          /* Main Meeting Workspace Grid */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Video Placeholder (2 cols) */}
            <div className="lg:col-span-2 rounded-3xl bg-slate-900 text-white p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl min-h-[420px]">
              <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-brand-950 via-slate-900 to-indigo-950 opacity-90" />

              <div className="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center mb-5 shadow-lg shadow-brand-500/10">
                <Video className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Phase 4 Real-Time Signaling Active
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Signaling Room Connected
              </h2>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-6">
                Socket.IO real-time presence and participant synchronization are operational. Multi-peer <strong>WebRTC video, audio streams, and screen sharing</strong> will be attached in <strong>Phase 5</strong>.
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Authenticated JWT Session
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {participants.length} Active in Room
                </span>
              </div>
            </div>

            {/* Right: Live Participant Roster (1 col) */}
            <div className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Participants
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time presence tracking
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  {participants.length}
                </span>
              </div>

              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isCurrentUser = p.userId === user?.id;
                  return (
                    <div
                      key={p.userId}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          {/* Presence Dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#131b2e] ${
                              p.presence === 'in_meeting'
                                ? 'bg-emerald-500'
                                : p.presence === 'reconnecting'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-slate-400'
                            }`}
                            title={`Status: ${p.presence}`}
                          />
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white truncate">
                            <span className="truncate">{p.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-normal text-slate-400">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {p.role === 'HOST' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Crown className="w-3 h-3 text-amber-500" />
                            Host
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Member
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Meeting Concluded Modal */}
      {meetingEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
              <Square className="w-6 h-6 fill-current" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Meeting Concluded
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {meetingEnded.message}. Thank you for using ConnectSphere.
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};