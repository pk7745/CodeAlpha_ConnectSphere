import React, { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { FileSharingPanel } from './FileSharingPanel';
import { NotesPanel } from './NotesPanel';
import { AgendaPanel } from './AgendaPanel';
import { ActionItemsPanel } from './ActionItemsPanel';
import { AiAssistantPanel } from './AiAssistantPanel';
import {
  MessageSquare,
  FileText,
  Paperclip,
  ListOrdered,
  ListTodo,
  PenTool,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export type WorkspaceTab = 'chat' | 'files' | 'notes' | 'agenda' | 'actions' | 'ai';

interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: WorkspaceTab;
  meetingId: string;
  roomCode: string;
  meetingTitle?: string;
  currentUserId: string;
  isHost: boolean;
  onOpenWhiteboard: () => void;
}

export const WorkspaceDrawer: React.FC<WorkspaceDrawerProps> = ({
  isOpen,
  onClose,
  defaultTab = 'chat',
  meetingId,
  roomCode,
  meetingTitle,
  currentUserId,
  isHost,
  onOpenWhiteboard,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(defaultTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'chat' as WorkspaceTab, label: 'Chat', icon: MessageSquare },
    { id: 'ai' as WorkspaceTab, label: 'AI', icon: Sparkles },
    { id: 'notes' as WorkspaceTab, label: 'Notes', icon: FileText },
    { id: 'agenda' as WorkspaceTab, label: 'Agenda', icon: ListOrdered },
    { id: 'actions' as WorkspaceTab, label: 'Tasks', icon: ListTodo },
    { id: 'files' as WorkspaceTab, label: 'Files', icon: Paperclip },
  ];

  return (
    <aside className="w-full lg:w-96 rounded-3xl bg-slate-900/95 border border-slate-800 p-4 flex flex-col shadow-2xl flex-shrink-0 h-[480px] lg:h-full backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Smart Workspace</h3>
            <p className="text-[10px] text-slate-400">Real-time collaboration suite</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Launch Whiteboard Quick Button */}
          <button
            type="button"
            onClick={onOpenWhiteboard}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            title="Open Collaborative Whiteboard"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Whiteboard</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80 mb-3 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' && (
          <ChatPanel
            meetingId={meetingId}
            roomCode={roomCode}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === 'ai' && (
          <AiAssistantPanel
            meetingId={meetingId}
            meetingTitle={meetingTitle || 'Current Meeting'}
          />
        )}
        {activeTab === 'notes' && (
          <NotesPanel
            meetingId={meetingId}
            roomCode={roomCode}
          />
        )}
        {activeTab === 'agenda' && (
          <AgendaPanel
            meetingId={meetingId}
          />
        )}
        {activeTab === 'actions' && (
          <ActionItemsPanel
            meetingId={meetingId}
          />
        )}
        {activeTab === 'files' && (
          <FileSharingPanel
            meetingId={meetingId}
            currentUserId={currentUserId}
            isHost={isHost}
          />
        )}
      </div>
    </aside>
  );
};
