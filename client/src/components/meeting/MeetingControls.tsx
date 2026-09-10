import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  PhoneOff,
  Square,
} from 'lucide-react';

interface MeetingControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  participantCount: number;
  showParticipants: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onLeaveMeeting,
  onEndMeeting,
  isEnding = false,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 rounded-2xl sm:rounded-3xl bg-slate-950/85 dark:bg-[#131b2e]/90 backdrop-blur-xl border border-slate-800 shadow-2xl z-20">
      {/* Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm ${
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
        className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm ${
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
        className={`p-3 sm:px-4 sm:py-3 rounded-2xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm ${
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
      <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

      {/* Participant Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleParticipants}
        className={`p-3 sm:px-3.5 sm:py-3 rounded-2xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm ${
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

      {/* Leave Meeting */}
      <button
        type="button"
        onClick={onLeaveMeeting}
        className="p-3 sm:px-4 sm:py-3 rounded-2xl font-medium text-xs flex items-center gap-2 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-900/60 border border-transparent text-slate-300 transition-all shadow-sm ml-auto sm:ml-0"
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
          className="p-3 sm:px-4 sm:py-3 rounded-2xl font-semibold text-xs flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 disabled:opacity-50"
          title="End meeting for all participants"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span className="hidden md:inline">End for All</span>
        </button>
      )}
    </div>
  );
};
