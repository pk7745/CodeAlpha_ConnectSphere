import React, { useState, useEffect } from 'react';
import {
  getMeetingAiSummaryApi,
  askMeetingAiAssistantApi,
  MeetingAiSummary,
} from '../../services/aiApi';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  BarChart2,
  ThumbsUp,
} from 'lucide-react';

interface AiAssistantPanelProps {
  meetingId: string;
  meetingTitle: string;
}

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  meetingId,
  meetingTitle,
}) => {
  const [summary, setSummary] = useState<MeetingAiSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your ConnectSphere AI Meeting Assistant. Ask me anything about "${meetingTitle}", including summaries, decisions, agenda progress, or action items.`,
    },
  ]);

  const loadSummary = async () => {
    if (!meetingId) return;
    try {
      setIsLoadingSummary(true);
      const data = await getMeetingAiSummaryApi(meetingId);
      setSummary(data);
    } catch (err) {
      console.error('[AI Panel] Failed to load summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [meetingId]);

  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = question.trim();
    if (!q || isAsking) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    try {
      const answer = await askMeetingAiAssistantApi(meetingId, q);
      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: answer,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I was unable to process your request at this moment.',
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ThumbsUp className="w-3 h-3" />
            Positive Sentiment
          </span>
        );
      case 'CONSTRUCTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <BarChart2 className="w-3 h-3" />
            Constructive Problem-Solving
          </span>
        );
      case 'ANALYTICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Sparkles className="w-3 h-3" />
            Analytical Deep Dive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600/50">
            Focused Sync
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* AI Summary Card */}
      <div className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>AI Executive Summary</span>
          </div>
          <button
            type="button"
            onClick={loadSummary}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Refresh summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingSummary ? (
          <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            <span>Analyzing meeting conversation...</span>
          </div>
        ) : summary ? (
          <>
            <p className="text-xs text-slate-200 leading-relaxed">
              {summary.executiveSummary}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {getSentimentBadge(summary.sentiment)}
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800">
                Engagement: {summary.engagementScore}%
              </span>
            </div>

            {/* Key Decisions */}
            {summary.decisionsMade.length > 0 && (
              <div className="pt-1.5 border-t border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Key Decisions:
                </span>
                <ul className="space-y-1">
                  {summary.decisionsMade.slice(0, 3).map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">Unable to generate summary at this time.</p>
        )}
      </div>

      {/* Interactive Q&A Assistant Chat */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          <Bot className="w-3.5 h-3.5 text-brand-400" />
          <span>Ask Meeting Assistant</span>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-0">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3 py-1.5 text-xs whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-xs'
                    : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-xs'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isAsking && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleAskQuestion} className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this meeting..."
            className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition-colors"
            title="Ask question"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
