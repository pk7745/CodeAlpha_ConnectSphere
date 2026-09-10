import React from 'react';
import { VideoTile } from './VideoTile';
import { ConnectionQuality } from '../../services/peerConnectionManager';

export interface ParticipantMediaData {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHost?: boolean;
  quality?: ConnectionQuality;
}

interface VideoGridProps {
  localParticipant: ParticipantMediaData;
  remoteParticipants: ParticipantMediaData[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localParticipant,
  remoteParticipants,
}) => {
  const allParticipants = [localParticipant, ...remoteParticipants];
  const count = allParticipants.length;

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
    <div
      className={`grid gap-4 flex-1 h-full min-h-[420px] items-center justify-center p-1 ${getGridClasses()}`}
    >
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
            quality={p.quality}
            className="w-full h-full"
          />
        </div>
      ))}
    </div>
  );
};
