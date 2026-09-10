import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  PhoneOff,
  Square,
  PenTool,
  Layers,
  Smile,
} from 'lucide-react';

interface MeetingControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  participantCount: number;
  showParticipants: boolean;
  showChat?: boolean;
  showWorkspace?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat?: () => void;
  onToggleWorkspace?: () => void;
  onOpenWhiteboard?: () => void;
  onSendReaction?: (emoji: string) => void;
  onLeaveMeeting: () => void;
  onEndMeeting?: () => void;
  isEnding?: boolean;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isHost,
  participantCount,
  showParticipants,
  showChat = false,
  showWorkspace = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onToggleChat,
  onToggleWorkspace,
  onOpenWhiteboard,
  onSendReaction,
  onLeaveMeeting,
  onEndMeeting,
  isEnding = false,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  return (
    <nav
      aria-label="Meeting controls"
      className="w-full max-w-2xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-3xl bg-slate-950/90 dark:bg-[#131b2e]/90 backdrop-blur-xl border border-slate-800 shadow-2xl z-20"
    >
      {/* Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        aria-label={isAudioMuted ? 'Unmute microphone (Ctrl+D)' : 'Mute microphone (Ctrl+D)'}
        aria-pressed={!isAudioMuted}
        className={`p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          isAudioMuted
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
        }`}
        title={isAudioMuted ? 'Unmute microphone (Ctrl+D)' : 'Mute microphone (Ctrl+D)'}
      >
        {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        <span className="hidden md:inline">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        aria-label={isVideoOff ? 'Turn on camera (Ctrl+E)' : 'Turn off camera (Ctrl+E)'}
        aria-pressed={!isVideoOff}
        className={`p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          isVideoOff
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
        }`}
        title={isVideoOff ? 'Turn on camera (Ctrl+E)' : 'Turn off camera (Ctrl+E)'}
      >
        {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        <span className="hidden md:inline">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
      </button>

      {/* Screen Share Toggle */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
        aria-pressed={isScreenSharing}
        className={`p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          isScreenSharing
            ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/25 ring-2 ring-brand-400/40'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
        }`}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
      >
        <Monitor className={`w-4 h-4 ${isScreenSharing ? 'animate-pulse' : ''}`} />
        <span className="hidden md:inline">
          {isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
        </span>
      </button>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-800 mx-0.5 sm:mx-1" />

      {/* Participant Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleParticipants}
        aria-label={`Toggle participant panel, ${participantCount} active`}
        aria-expanded={showParticipants}
        className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          showParticipants
            ? 'bg-slate-700 text-white ring-1 ring-slate-500'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
        }`}
        title="Toggle participants panel"
      >
        <Users className="w-4 h-4" />
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300">
          {participantCount}
        </span>
      </button>

      {/* Collaborative Whiteboard Button */}
      {onOpenWhiteboard && (
        <button
          type="button"
          onClick={onOpenWhiteboard}
          aria-label="Open collaborative whiteboard"
          className="p-2.5 sm:px-3 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-brand-300"
          title="Open Collaborative Whiteboard"
        >
          <PenTool className="w-4 h-4" />
          <span className="hidden lg:inline">Whiteboard</span>
        </button>
      )}

      {/* Real-time Reaction Picker Button */}
      {onSendReaction && (
        <div className="relative">
          {showReactionPicker && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md animate-fadeIn z-30">
              {['👍', '❤️', '👏', '🎉', '🔥', '💡'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactionPicker(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-800 focus:outline-none"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowReactionPicker((prev) => !prev)}
            aria-label="Send reaction"
            aria-expanded={showReactionPicker}
            className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              showReactionPicker
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-amber-300'
            }`}
            title="Send Reaction"
          >
            <Smile className="w-4 h-4" />
            <span className="hidden lg:inline">React</span>
          </button>
        </div>
      )}

      {/* Smart Workspace Toggle (Chat, Notes, Agenda, Files) */}
      <button
        type="button"
        onClick={onToggleWorkspace || onToggleChat}
        aria-label="Toggle collaboration workspace"
        aria-expanded={showWorkspace || showChat}
        className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          showWorkspace || showChat
            ? 'bg-brand-600 text-white shadow-brand-600/20 ring-1 ring-brand-400'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
        }`}
        title="Toggle Smart Workspace (Chat, Notes, Agenda, Files)"
      >
        <Layers className="w-4 h-4" />
        <span className="hidden sm:inline">Workspace</span>
      </button>

      {/* Leave Meeting */}
      <button
        type="button"
        onClick={onLeaveMeeting}
        aria-label="Leave meeting"
        className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl font-medium text-xs flex items-center gap-1.5 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-900/60 border border-transparent text-slate-300 transition-all shadow-sm ml-auto sm:ml-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        title="Leave meeting"
      >
        <PhoneOff className="w-4 h-4 text-rose-400" />
        <span className="hidden md:inline">Leave</span>
      </button>

      {/* Host End Meeting */}
      {isHost && onEndMeeting && (
        <button
          type="button"
          onClick={onEndMeeting}
          disabled={isEnding}
          aria-label="End meeting for all participants"
          className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          title="End meeting for all participants"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span className="hidden md:inline">End for All</span>
        </button>
      )}
    </nav>
  );
};
