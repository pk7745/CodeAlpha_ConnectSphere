import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowRight, ArrowLeft, Shield, AlertTriangle, Activity } from 'lucide-react';
import { useAudioActivity } from '../../hooks/useAudioActivity';

interface PreJoinModalProps {
  roomCode: string;
  meetingTitle: string;
  userName: string;
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  mediaError: string | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onJoinMeeting: () => void;
  onCancel?: () => void;
}

export const PreJoinModal: React.FC<PreJoinModalProps> = ({
  roomCode,
  meetingTitle,
  userName,
  localStream,
  isAudioMuted,
  isVideoOff,
  mediaError,
  onToggleAudio,
  onToggleVideo,
  onJoinMeeting,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isSpeaking, audioLevel } = useAudioActivity(localStream, isAudioMuted);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center animate-fadeIn">
        {/* Room Header */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            Ready to Join Meeting
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
            {meetingTitle}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Room Code: <span className="text-brand-400 font-bold">{roomCode}</span>
          </p>
        </div>

        {/* Camera Preview Area */}
        <div
          className={`w-full aspect-video max-w-lg rounded-2xl bg-slate-950 overflow-hidden relative shadow-inner flex items-center justify-center mb-6 border transition-all duration-300 ${
            isSpeaking ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40' : 'border-slate-800'
          }`}
        >
          {localStream && !isVideoOff ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-200 border border-slate-700 shadow-inner">
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </div>
              <span className="text-xs font-medium">Camera is Off</span>
            </div>
          )}

          {/* Quick overlay controls */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-xl">
            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                isAudioMuted
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isAudioMuted ? 'Unmute microphone (Ctrl+D)' : 'Mute microphone (Ctrl+D)'}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleVideo}
              aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              className={`p-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                isVideoOff
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn on camera (Ctrl+E)' : 'Turn off camera (Ctrl+E)'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          </div>

          {/* Live Audio Activity Meter Indicator */}
          {!isAudioMuted && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700/60 backdrop-blur-md text-[11px] font-medium text-slate-300"
              title={`Microphone input: ${audioLevel}%`}
            >
              <Activity className={`w-3 h-3 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 rounded-full ${
                    isSpeaking ? 'bg-emerald-400' : 'bg-brand-500'
                  }`}
                  style={{ width: `${Math.max(5, audioLevel)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Media error notice if permissions denied */}
        {mediaError && (
          <div className="w-full max-w-lg mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Media Access Notice</p>
              <p className="mt-0.5 opacity-90">{mediaError}</p>
            </div>
          </div>
        )}

        {/* User confirmation & Actions */}
        <div className="w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-left text-xs text-slate-400 order-2 sm:order-1">
            Joining as <span className="font-bold text-white">{userName}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel and return to dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={onJoinMeeting}
              aria-label="Join meeting"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Join Meeting
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};