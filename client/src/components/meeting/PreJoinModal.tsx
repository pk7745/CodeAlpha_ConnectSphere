import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowRight, Shield, AlertTriangle } from 'lucide-react';

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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Room Header */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            <Shield className="w-3.5 h-3.5 text-brand-500" />
            Ready to Join Meeting
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            {meetingTitle}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Room Code: <span className="text-brand-600 dark:text-brand-400 font-bold">{roomCode}</span>
          </p>
        </div>

        {/* Camera Preview Area */}
        <div className="w-full aspect-video max-w-lg rounded-2xl bg-slate-900 overflow-hidden relative shadow-inner flex items-center justify-center mb-6 border border-slate-800">
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
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium">Camera is Off</span>
            </div>
          )}

          {/* Quick overlay controls */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50">
            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-2.5 rounded-full transition-all ${
                isAudioMuted
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleVideo}
              className={`p-2.5 rounded-full transition-all ${
                isVideoOff
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Media error notice if permissions denied */}
        {mediaError && (
          <div className="w-full max-w-lg mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Media Access Notice</p>
              <p className="mt-0.5 opacity-90">{mediaError}</p>
            </div>
          </div>
        )}

        {/* User confirmation & Action */}
        <div className="w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-left text-xs text-slate-500 dark:text-slate-400">
            Joining as <span className="font-bold text-slate-800 dark:text-slate-200">{userName}</span>
          </div>

          <button
            type="button"
            onClick={onJoinMeeting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
          >
            Join Meeting
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};