import React, { useEffect, useState } from 'react';
import { getMeetingSummaryApi } from '../../services/meetingApi';
import { getMeetingAiSummaryApi, MeetingAiSummary } from '../../services/aiApi';
import { MeetingSummary } from '../../types/meeting';
import { X, Clock, Users, Shield, Calendar, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface MeetingSummaryModalProps {
  isOpen: boolean;
  meetingId: string | null;
  onClose: () => void;
}

export const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({
  isOpen,
  meetingId,
  onClose,
}) => {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<MeetingAiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && meetingId) {
      setIsLoading(true);
      setError(null);
      Promise.all([
        getMeetingSummaryApi(meetingId).catch(() => null),
        getMeetingAiSummaryApi(meetingId).catch(() => null),
      ])
        .then(([data, aiData]) => {
          if (!data) throw new Error('Failed to load meeting summary.');
          setSummary(data);
          setAiSummary(aiData);
        })
        .catch((err) => setError(err.message || 'Failed to load meeting summary.'))
        .finally(() => setIsLoading(false));
    } else {
      setSummary(null);
      setAiSummary(null);
    }
  }, [isOpen, meetingId]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
            Meeting Summary
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            {summary?.title || 'Session Summary'}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {summary?.roomCode}
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading meeting metrics...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 my-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        ) : summary ? (
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-brand-500" />
                  Duration
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {formatDuration(summary.durationSeconds)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Participants
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {summary.participantCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Status
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize pt-1">
                  {summary.status.toLowerCase()}
                </div>
              </div>
            </div>

            {/* Host & Date info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Host:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {summary.host.name} ({summary.host.email})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created:
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(summary.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* AI Executive Summary Card */}
            {aiSummary && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50/50 to-indigo-50/30 dark:from-brand-950/20 dark:to-slate-900/40 border border-brand-200/60 dark:border-brand-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Executive Intelligence</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                    {aiSummary.sentiment} Sentiment
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {aiSummary.executiveSummary}
                </p>

                {aiSummary.decisionsMade.length > 0 && (
                  <div className="pt-2 border-t border-brand-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Key Decisions:
                    </span>
                    <ul className="space-y-1">
                      {aiSummary.decisionsMade.slice(0, 3).map((d, i) => (
                        <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Participants list */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Participant Roster ({summary.participants.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {summary.participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 flex items-center justify-between bg-white dark:bg-slate-900/40 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 font-semibold flex items-center justify-center text-[10px]">
                        {p.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {p.user.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.user.email}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        p.role === 'HOST'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {p.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};