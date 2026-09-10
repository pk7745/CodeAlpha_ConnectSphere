import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff, Monitor, Crown, Wifi, WifiOff } from 'lucide-react';
import { ConnectionQuality } from '../../services/peerConnectionManager';

export interface VideoTileProps {
  stream: MediaStream | null;
  userName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHost?: boolean;
  quality?: ConnectionQuality;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  userName,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  isHost = false,
  quality,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  // Check whether we have an active video feed to display
  const hasVideoTrack = !!(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks()[0].enabled &&
    (isScreenSharing || !isVideoOff)
  );

  const getQualityBadge = () => {
    if (!quality || isLocal) return null;

    switch (quality) {
      case 'Excellent':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm"
            title="Connection quality: Excellent"
          >
            <Wifi className="w-3 h-3 text-emerald-400" />
            HD
          </span>
        );
      case 'Good':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm"
            title="Connection quality: Good"
          >
            <Wifi className="w-3 h-3 text-emerald-400" />
            Good
          </span>
        );
      case 'Poor':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm"
            title="Connection quality: Poor"
          >
            <Wifi className="w-3 h-3 text-amber-400" />
            Poor
          </span>
        );
      case 'Reconnecting':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse backdrop-blur-sm"
            title="Reconnecting to peer..."
          >
            <Wifi className="w-3 h-3 text-amber-400 animate-spin" />
            Reconnecting
          </span>
        );
      case 'Disconnected':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-sm"
            title="Connection disconnected"
          >
            <WifiOff className="w-3 h-3 text-rose-400" />
            Disconnected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center group ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasVideoTrack ? 'opacity-100' : 'opacity-0'
        } ${isLocal && !isScreenSharing ? 'transform -scale-x-100' : ''}`}
      />

      {/* Avatar Fallback when Camera is Off */}
      {!hasVideoTrack && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-2xl border-2 border-white/10 ring-4 ring-brand-500/20">
            {userName ? userName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <VideoOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Camera is off</span>
          </div>
        </div>
      )}

      {/* Top Badges (Quality & Presenting) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2 z-10">
        {isScreenSharing ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-600/90 text-white border border-brand-400/40 shadow-md backdrop-blur-md">
            <Monitor className="w-3.5 h-3.5 animate-pulse text-sky-200" />
            Presenting
          </span>
        ) : (
          <div />
        )}

        <div>{getQualityBadge()}</div>
      </div>

      {/* Bottom Info Bar Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
        {/* Name & Role Badge */}
        <div className="flex items-center gap-2 max-w-[80%]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/75 border border-slate-700/50 backdrop-blur-md text-white text-xs font-semibold shadow-md truncate">
            {isHost && (
              <span title="Meeting Host">
                <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </span>
            )}
            <span className="truncate">{userName}</span>
            {isLocal && (
              <span className="text-[11px] font-normal text-slate-300 flex-shrink-0">
                (You)
              </span>
            )}
          </div>
        </div>

        {/* Audio Muted Indicator */}
        {isMuted && (
          <div
            className="p-1.5 rounded-xl bg-rose-600/90 text-white border border-rose-400/40 shadow-md backdrop-blur-md flex-shrink-0"
            title="Microphone muted"
          >
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
