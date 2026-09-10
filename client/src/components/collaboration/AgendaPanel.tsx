import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import {
  getAgendaItemsApi,
  createAgendaItemApi,
  toggleAgendaItemApi,
  deleteAgendaItemApi,
  AgendaItem,
} from '../../services/collaborationApi';
import { CheckSquare, Square, Plus, Trash2, Loader2, ListOrdered, CheckCircle2 } from 'lucide-react';

interface AgendaPanelProps {
  meetingId: string;
}

export const AgendaPanel: React.FC<AgendaPanelProps> = ({ meetingId }) => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadAgenda = async () => {
    if (!meetingId) return;
    try {
      setIsLoading(true);
      const data = await getAgendaItemsApi(meetingId);
      setItems(data);
    } catch (err) {
      console.error('[Agenda] Failed to load agenda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();

    const socket = socketService.getSocket();

    const handleAgendaUpdated = (payload: { items: AgendaItem[] }) => {
      if (Array.isArray(payload?.items)) {
        setItems(payload.items);
      }
    };

    socket.on('agenda:updated', handleAgendaUpdated);

    return () => {
      socket.off('agenda:updated', handleAgendaUpdated);
    };
  }, [meetingId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    try {
      setIsAdding(true);
      const created = await createAgendaItemApi(meetingId, title);
      setItems((prev) => [...prev, created]);
      setNewItemTitle('');
    } catch (err: any) {
      alert(err.message || 'Failed to add agenda item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (item: AgendaItem) => {
    const updatedStatus = !item.isCompleted;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isCompleted: updatedStatus } : i))
    );

    try {
      await toggleAgendaItemApi(meetingId, item.id, updatedStatus);
    } catch (err: any) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isCompleted: item.isCompleted } : i))
      );
      console.error('[Agenda] Toggle error:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteAgendaItemApi(meetingId, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete agenda item');
    }
  };

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* Header & Progress */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-brand-400" />
          <h4 className="text-xs font-bold text-white">Live Meeting Agenda</h4>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {completedCount} of {items.length} Completed
        </span>
      </div>

      {/* Progress Bar */}
      {items.length > 0 && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Add Agenda Item Form */}
      <form onSubmit={handleAddItem} className="flex items-center gap-2">
        <input
          type="text"
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="Add agenda topic..."
          className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={!newItemTitle.trim() || isAdding}
          className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition-colors flex items-center justify-center"
          title="Add topic"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>

      {/* Agenda Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading agenda...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-semibold text-slate-400">No agenda topics added</p>
            <p className="text-[10px] text-slate-500">Add key discussion points to keep the call focused</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl border transition-colors ${
                item.isCompleted
                  ? 'bg-slate-800/40 border-slate-800 text-slate-400'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(item)}
                className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
              >
                {item.isCompleted ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs block break-words ${
                    item.isCompleted ? 'line-through text-slate-500' : 'text-slate-100 font-medium'
                  }`}
                >
                  <span className="text-slate-500 mr-1.5 font-mono">{idx + 1}.</span>
                  {item.title}
                </span>
                {item.isCompleted && item.completedBy && (
                  <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                    Completed by {item.completedBy}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                title="Remove topic"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
