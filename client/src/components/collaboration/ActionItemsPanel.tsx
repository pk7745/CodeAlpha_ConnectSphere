import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import {
  getActionItemsApi,
  createActionItemApi,
  updateActionItemApi,
  deleteActionItemApi,
  ActionItem,
} from '../../services/collaborationApi';
import { CheckCircle, Clock, Circle, Plus, Trash2, Loader2, ListTodo, User } from 'lucide-react';

interface ActionItemsPanelProps {
  meetingId: string;
}

export const ActionItemsPanel: React.FC<ActionItemsPanelProps> = ({ meetingId }) => {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadActions = async () => {
    if (!meetingId) return;
    try {
      setIsLoading(true);
      const data = await getActionItemsApi(meetingId);
      setItems(data);
    } catch (err) {
      console.error('[ActionItems] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActions();

    const socket = socketService.getSocket();

    const handleActionUpdated = (payload: { items: ActionItem[] }) => {
      if (Array.isArray(payload?.items)) {
        setItems(payload.items);
      }
    };

    socket.on('action:updated', handleActionUpdated);

    return () => {
      socket.off('action:updated', handleActionUpdated);
    };
  }, [meetingId]);

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = newTask.trim();
    if (!task) return;

    try {
      setIsAdding(true);
      const created = await createActionItemApi(meetingId, task, newAssignee.trim() || undefined);
      setItems((prev) => [created, ...prev]);
      setNewTask('');
      setNewAssignee('');
    } catch (err: any) {
      alert(err.message || 'Failed to add action item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCycleStatus = async (item: ActionItem) => {
    const nextStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' =
      item.status === 'TODO'
        ? 'IN_PROGRESS'
        : item.status === 'IN_PROGRESS'
        ? 'DONE'
        : 'TODO';

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
    );

    try {
      await updateActionItemApi(meetingId, item.id, nextStatus);
    } catch (err: any) {
      // Revert
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
      );
      console.error('[ActionItems] Update status error:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteActionItemApi(meetingId, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete action item');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'DONE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <CheckCircle className="w-3 h-3" />
          Done
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600/50">
        <Circle className="w-3 h-3" />
        To Do
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-brand-400" />
          <h4 className="text-xs font-bold text-white">Action Items & Deliverables</h4>
        </div>
        <span className="text-[11px] text-slate-400 font-semibold">
          {items.filter((i) => i.status === 'DONE').length} of {items.length} Resolved
        </span>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddAction} className="flex flex-col gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task description..."
          className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="Assignee (optional)..."
            className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newTask.trim() || isAdding}
            className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </form>

      {/* Action Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading tasks...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
            <ListTodo className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-semibold text-slate-400">No action items defined</p>
            <p className="text-[10px] text-slate-500">Assign next steps to ensure team accountability</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-xs font-medium break-words ${
                    item.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-100'
                  }`}
                >
                  {item.task}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 flex-shrink-0"
                  title="Delete action item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="font-semibold text-slate-300 truncate max-w-[120px]">
                    {item.assigneeName || 'Unassigned'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCycleStatus(item)}
                  title="Click to cycle status (To Do -> In Progress -> Done)"
                  className="cursor-pointer"
                >
                  {getStatusBadge(item.status)}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
