import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socketService';
import {
  getMeetingNotesApi,
  updateMeetingNotesApi,
} from '../../services/collaborationApi';
import { FileText, Loader2, Cloud } from 'lucide-react';

interface NotesPanelProps {
  meetingId: string;
  roomCode: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ meetingId, roomCode }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      if (!meetingId) return;
      try {
        setIsLoading(true);
        const data = await getMeetingNotesApi(meetingId);
        if (isMounted) {
          setContent(data || '');
        }
      } catch (err) {
        console.error('[Notes] Failed to load notes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadNotes();

    const socket = socketService.getSocket();

    const handleRemoteNoteUpdate = (payload: { content: string; updatedBy?: string }) => {
      if (typeof payload?.content === 'string') {
        setContent(payload.content);
        setLastSavedTime('Just now');
      }
    };

    socket.on('note:updated', handleRemoteNoteUpdate);

    return () => {
      isMounted = false;
      socket.off('note:updated', handleRemoteNoteUpdate);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [meetingId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsSaving(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Broadcast through socket for low latency
        const socket = socketService.getSocket();
        socket.emit('note:update', { roomCode, content: newContent });

        // Persist through REST
        await updateMeetingNotesApi(meetingId, newContent);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('[Notes] Failed to auto-save:', err);
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* Header status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-400" />
          <h4 className="text-xs font-bold text-white">Collaborative Meeting Notes</h4>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Saving...</span>
            </>
          ) : lastSavedTime ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved {lastSavedTime}</span>
            </>
          ) : (
            <span>Auto-saving synced</span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading notes...</span>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Type shared meeting notes, summaries, ideas, or markdown here... All participants see updates live in real time."
            className="w-full h-full p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none font-mono leading-relaxed"
          />
        )}
      </div>
    </div>
  );
};
