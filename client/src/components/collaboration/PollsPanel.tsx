import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import {
  getMeetingPollsApi,
  createMeetingPollApi,
  voteMeetingPollApi,
  closeMeetingPollApi,
  PollItem,
} from '../../services/pollApi';
import {
  BarChart3,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  Lock,
  Vote,
} from 'lucide-react';

interface PollsPanelProps {
  meetingId: string;
  roomCode: string;
  currentUserId: string;
  isHost: boolean;
}

export const PollsPanel: React.FC<PollsPanelProps> = ({
  meetingId,
  currentUserId,
  isHost,
}) => {
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const loadPolls = async () => {
    if (!meetingId) return;
    try {
      setIsLoading(true);
      const data = await getMeetingPollsApi(meetingId);
      setPolls(data);
    } catch (err) {
      console.error('[Polls] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();

    const socket = socketService.getSocket();

    const handlePollCreated = (data: { poll: PollItem }) => {
      if (data && data.poll) {
        setPolls((prev) => {
          if (prev.some((p) => p.id === data.poll.id)) return prev;
          return [data.poll, ...prev];
        });
      }
    };

    const handlePollVoted = (data: {
      pollId: string;
      voteCounts: number[];
      optionIdx: number;
      userId: string;
    }) => {
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== data.pollId) return p;
          const isUser = data.userId === currentUserId;
          const totalVotes = data.voteCounts.reduce((acc, count) => acc + count, 0);
          return {
            ...p,
            voteCounts: data.voteCounts,
            totalVotes,
            userVotedOption: isUser ? data.optionIdx : p.userVotedOption,
          };
        })
      );
    };

    const handlePollClosed = (data: { pollId: string }) => {
      setPolls((prev) =>
        prev.map((p) => (p.id === data.pollId ? { ...p, status: 'CLOSED' } : p))
      );
    };

    socket.on('poll:created', handlePollCreated);
    socket.on('poll:voted', handlePollVoted);
    socket.on('poll:closed', handlePollClosed);

    return () => {
      socket.off('poll:created', handlePollCreated);
      socket.off('poll:voted', handlePollVoted);
      socket.off('poll:closed', handlePollClosed);
    };
  }, [meetingId, currentUserId]);

  const handleAddOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, idx) => idx !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...newOptions];
    updated[index] = val;
    setNewOptions(updated);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = newQuestion.trim();
    const cleanOpts = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!q || cleanOpts.length < 2) return;

    try {
      setIsSubmitting(true);
      const created = await createMeetingPollApi(meetingId, q, cleanOpts);
      setPolls((prev) => [created, ...prev]);
      setNewQuestion('');
      setNewOptions(['', '']);
      setShowCreateForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, optionIdx: number) => {
    try {
      setVotingPollId(pollId);
      const res = await voteMeetingPollApi(meetingId, pollId, optionIdx);
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? {
                ...p,
                userVotedOption: res.userVotedOption,
                voteCounts: res.voteCounts,
                totalVotes: res.totalVotes,
              }
            : p
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to submit vote');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!window.confirm('Close this poll to end voting?')) return;
    try {
      await closeMeetingPollApi(meetingId, pollId);
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, status: 'CLOSED' } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to close poll');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          <h4 className="text-xs font-bold text-white">Live Meeting Polls</h4>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showCreateForm ? 'Cancel' : 'New Poll'}</span>
        </button>
      </div>

      {/* Create Poll Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreatePoll}
          className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl space-y-2.5 animate-fadeIn"
        >
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-slate-900/90 border border-slate-700/70 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div className="space-y-1.5">
            {newOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-slate-900/90 border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {newOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            {newOptions.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Option
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !newQuestion.trim()}
              className="ml-auto px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Publishing...' : 'Launch Poll'}
            </button>
          </div>
        </form>
      )}

      {/* Polls List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading polls...</span>
          </div>
        ) : polls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
            <Vote className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-semibold text-slate-400">No active polls</p>
            <p className="text-[10px] text-slate-500">Create a quick poll to gather instant team consensus</p>
          </div>
        ) : (
          polls.map((poll) => {
            const isClosed = poll.status === 'CLOSED';
            const canClose = !isClosed && (isHost || poll.creator?.id === currentUserId);
            return (
              <div
                key={poll.id}
                className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-xl space-y-2.5"
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-white break-words">
                      {poll.question}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{poll.totalVotes} total vote{poll.totalVotes === 1 ? '' : 's'}</span>
                      <span>&bull;</span>
                      <span>{isClosed ? 'Closed' : 'Open'}</span>
                    </div>
                  </div>

                  {canClose && (
                    <button
                      type="button"
                      onClick={() => handleClosePoll(poll.id)}
                      className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 transition-colors flex-shrink-0"
                      title="Close poll"
                    >
                      <Lock className="w-3 h-3" />
                      Close
                    </button>
                  )}
                </div>

                {/* Options List with Percentage Bars */}
                <div className="space-y-1.5">
                  {poll.options.map((option, idx) => {
                    const votes = poll.voteCounts?.[idx] || 0;
                    const percent = poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
                    const isSelected = poll.userVotedOption === idx;
                    const isBusy = votingPollId === poll.id;

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isClosed || isBusy}
                        onClick={() => handleVote(poll.id, idx)}
                        className={`w-full relative overflow-hidden rounded-xl border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-brand-500/80 bg-brand-950/40 text-white'
                            : 'border-slate-700/60 bg-slate-900/60 hover:bg-slate-900/90 text-slate-200'
                        } ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {/* Progress Fill Bar */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            isSelected ? 'bg-brand-500/25' : 'bg-slate-700/30'
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        {/* Option Label and Percent */}
                        <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isSelected && (
                              <CheckCircle className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                            )}
                            <span className="truncate font-medium">{option}</span>
                          </div>
                          <span className="font-bold text-[11px] text-slate-400 flex-shrink-0">
                            {percent}% ({votes})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
