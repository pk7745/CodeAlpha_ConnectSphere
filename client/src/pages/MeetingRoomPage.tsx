import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMeetingByCodeApi } from '../services/meetingApi';
import { Meeting } from '../types/meeting';
import { Navbar } from '../components/common/Navbar';
import {
  Video,
  Copy,
  Check,
  ArrowLeft,
  Users,
  Shield,
  Radio,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      setError('No room code provided.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    getMeetingByCodeApi(roomCode)
      .then((data) => setMeeting(data))
      .catch((err) => setError(err.message || 'Meeting not found or has ended.'))
      .finally(() => setIsLoading(false));
  }, [roomCode]);

  const handleCopyCode = async () => {
    if (!meeting) return;
    try {
      await navigator.clipboard.writeText(meeting.roomCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-500">Resolving meeting room...</p>
          </div>
        ) : error ? (
          <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-[#131b2e] border border-rose-200 dark:border-rose-900/60 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Unable to Join Meeting
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {error}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        ) : meeting ? (
          <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 text-center">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-6">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              Meeting Room Verified &amp; Active
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {meeting.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">
              Hosted by <span className="font-semibold text-slate-700 dark:text-slate-300">{meeting.host.name}</span> &bull; Created {new Date(meeting.createdAt).toLocaleDateString()}
            </p>

            {/* Room Code Card */}
            <div className="max-w-xs mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between mb-8 shadow-inner">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Room Code
                </span>
                <span className="font-mono text-xl font-bold tracking-wider text-brand-600 dark:text-brand-400">
                  {meeting.roomCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Architecture / Next Phase Roadmap Callout */}
            <div className="p-5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/80 dark:border-brand-900/40 text-left text-xs mb-8">
              <div className="flex items-center gap-2 font-bold text-brand-800 dark:text-brand-300 mb-2">
                <Shield className="w-4 h-4 text-brand-500" />
                Phase 3 Architecture Verification
              </div>
              <p className="text-brand-700/80 dark:text-brand-300/80 leading-relaxed">
                The authenticated room resolution layer is fully operating. Real-time multi-peer WebRTC video mesh, media acquisition, screen sharing, and Socket.IO signaling will be attached to this room in <strong>Phase 4 &amp; 5</strong>.
              </p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-brand-600/90 dark:text-brand-400/90 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Room Session Active
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {meeting.participantCount ?? 1} Participant in database
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
              >
                <Video className="w-4 h-4" />
                {isCopied ? 'Code Copied!' : 'Share Room Code'}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};