import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Meeting } from '../../types/meeting';
import { Video, Copy, Check, Users, Calendar, Crown, FileText, Square } from 'lucide-react';

interface MeetingCardProps {
  meeting: Meeting;
  onEndMeeting?: (id: string) => Promise<void>;
  onViewSummary: (id: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onEndMeeting,
  onViewSummary,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(meeting.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleEnd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEndMeeting || isEnding) return;
    if (window.confirm(`Are you sure you want to end "${meeting.title}"?`)) {
      setIsEnding(true);
      try {
        await onEndMeeting(meeting.id);
      } finally {
        setIsEnding(false);
      }
    }
  };

  const isActive = meeting.status === 'ACTIVE';
  const formattedDate = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-5 shadow-sm hover:shadow-md transition-all hover:border-brand-500/40 dark:hover:border-brand-500/30 flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {meeting.status}
            </span>

            {meeting.isHost && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Crown className="w-3 h-3 text-amber-500" />
                Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>{meeting.participantCount ?? 1}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-2 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {meeting.title}
        </h4>

        {/* Room Code Badge */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-4">
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
            {meeting.roomCode}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy room code"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
          <span className="truncate max-w-[110px]">
            {meeting.isHost ? 'By You' : `By ${meeting.host.name}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/meeting/${meeting.roomCode}`)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all hover:shadow"
              >
                <Video className="w-3.5 h-3.5" />
                Enter Room
              </button>

              {meeting.isHost && onEndMeeting && (
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={isEnding}
                  title="End meeting for all"
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onViewSummary(meeting.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              View Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
};