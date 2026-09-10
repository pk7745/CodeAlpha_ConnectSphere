import React, { useState } from 'react';
import { VideoTile } from './VideoTile';
import { ConnectionQuality } from '../../services/peerConnectionManager';
import { Copy, Check, Users } from 'lucide-react';

export interface ParticipantMediaData {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHost?: boolean;
  isSpeaking?: boolean;
  quality?: ConnectionQuality;
}

interface VideoGridProps {
  localParticipant: ParticipantMediaData;
  remoteParticipants: ParticipantMediaData[];
  roomCode?: string;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localParticipant,
  remoteParticipants,
  roomCode,
}) => {
  const [copied, setCopied] = useState(false);
  const allParticipants = [localParticipant, ...remoteParticipants];
  const count = allParticipants.length;

  const handleCopy = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Check if anyone is actively sharing their screen
  const screenSharer = allParticipants.find((p) => p.isScreenSharing);

  // Spotlight layout when someone is screen sharing
  if (screenSharer) {
    const others = allParticipants.filter((p) => p.id !== screenSharer.id);

    return (
      <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-h-[500px] overflow-hidden">
        {/* Main Spotlight: Screen Share Feed */}
        <div className="flex-1 h-full min-h-[360px] rounded-3xl overflow-hidden shadow-2xl">
          <VideoTile
            stream={screenSharer.stream}
            userName={screenSharer.name}
            isLocal={screenSharer.isLocal}
            isMuted={screenSharer.isMuted}
            isVideoOff={screenSharer.isVideoOff}
            isScreenSharing={true}
            isHost={screenSharer.isHost}
            isSpeaking={screenSharer.isSpeaking}
            quality={screenSharer.quality}
            className="w-full h-full"
          />
        </div>

        {/* Filmstrip of other participants */}
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-72 flex-shrink-0 py-1">
          {others.map((p) => (
            <div
              key={p.id}
              className="w-48 sm:w-56 lg:w-full h-32 sm:h-36 lg:h-44 flex-shrink-0 rounded-2xl overflow-hidden shadow-md"
            >
              <VideoTile
                stream={p.stream}
                userName={p.name}
                isLocal={p.isLocal}
                isMuted={p.isMuted}
                isVideoOff={p.isVideoOff}
                isScreenSharing={false}
                isHost={p.isHost}
                isSpeaking={p.isSpeaking}
                quality={p.quality}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Adaptive Grid layouts for 1 to 6 participants
  const getGridClasses = () => {
    if (count === 1) {
      return 'grid-cols-1 max-w-4xl mx-auto w-full';
    }
    if (count === 2) {
      return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto w-full';
    }
    if (count <= 4) {
      return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto w-full';
    }
    // 5 to 6 participants
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto w-full';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-[420px] justify-center relative">
      {/* Empty room notification if host is alone */}
      {remoteParticipants.length === 0 && roomCode && (
        <div className="mb-3 mx-auto w-full max-w-lg px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-slate-300 shadow-md">
          <div className="flex items-center gap-2 truncate">
            <Users className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span className="truncate">Waiting for others to join...</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/30 font-semibold transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Invite'}</span>
          </button>
        </div>
      )}

      <div className={`grid gap-4 flex-1 h-full items-center justify-center p-1 ${getGridClasses()}`}>
        {allParticipants.map((p) => (
          <div key={p.id} className="w-full h-full min-h-[220px] flex items-center justify-center">
            <VideoTile
              stream={p.stream}
              userName={p.name}
              isLocal={p.isLocal}
              isMuted={p.isMuted}
              isVideoOff={p.isVideoOff}
              isScreenSharing={p.isScreenSharing}
              isHost={p.isHost}
              isSpeaking={p.isSpeaking}
              quality={p.quality}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
