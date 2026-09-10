import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMeetingSocket } from '../hooks/useMeetingSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { Navbar } from '../components/common/Navbar';
import { PreJoinModal } from '../components/meeting/PreJoinModal';
import { VideoGrid, ParticipantMediaData } from '../components/meeting/VideoGrid';
import { MeetingControls } from '../components/meeting/MeetingControls';
import {
  Copy,
  Check,
  ArrowLeft,
  Users,
  Radio,
  LogOut,
  Crown,
  Loader2,
  AlertCircle,
  Square,
  Lock,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
} from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Socket.IO Room & Presence State
  const {
    meeting,
    participants,
    connectionState,
    isHost,
    isLoading: isSocketLoading,
    error: socketError,
    meetingEnded,
    leaveMeeting,
    endMeeting,
  } = useMeetingSocket(roomCode);

  // WebRTC Mesh & Media State
  const {
    localStream,
    screenStream,
    remoteStreams,
    connectionQualities,
    remoteMediaStates,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    acquireLocalMedia,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopAllMedia,
  } = useWebRTC(roomCode, user?.id);

  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Acquire local media preview on mount
  useEffect(() => {
    let active = true;
    acquireLocalMedia(true, true).then((stream) => {
      if (!active && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    });

    return () => {
      active = false;
      stopAllMedia();
    };
  }, [acquireLocalMedia, stopAllMedia]);

  // Keyboard shortcuts (Ctrl+D for mute, Ctrl+E for video)
  useEffect(() => {
    if (!hasJoinedRoom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleAudio();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasJoinedRoom, toggleAudio, toggleVideo]);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleLeave = async () => {
    stopAllMedia();
    await leaveMeeting();
    navigate('/dashboard');
  };

  const handleEnd = async () => {
    if (!window.confirm('Are you sure you want to end this meeting for all participants?')) {
      return;
    }
    setIsEnding(true);
    try {
      stopAllMedia();
      await endMeeting();
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to end meeting');
    } finally {
      setIsEnding(false);
    }
  };

  // Pre-join Modal View
  if (!hasJoinedRoom && !socketError) {
    return (
      <PreJoinModal
        roomCode={roomCode || ''}
        meetingTitle={meeting?.title || 'ConnectSphere Meeting'}
        userName={user?.name || 'Guest'}
        localStream={localStream}
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        mediaError={mediaError}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onJoinMeeting={() => setHasJoinedRoom(true)}
      />
    );
  }

  // Remote participants transformed for VideoGrid
  const remoteParticipantsData: ParticipantMediaData[] = participants
    .filter((p) => p.userId !== user?.id)
    .map((p) => {
      const mediaState = remoteMediaStates.get(p.userId);
      const stream = remoteStreams.get(p.userId) || null;
      return {
        id: p.userId,
        name: p.name,
        stream,
        isLocal: false,
        isMuted: mediaState ? !mediaState.audioEnabled : false,
        isVideoOff: mediaState ? !mediaState.videoEnabled : false,
        isScreenSharing: !!mediaState?.screenSharing,
        isHost: p.role === 'HOST',
        quality: connectionQualities.get(p.userId),
      };
    });

  const localParticipantData: ParticipantMediaData = {
    id: user?.id || 'local',
    name: user?.name || 'You',
    stream: isScreenSharing && screenStream ? screenStream : localStream,
    isLocal: true,
    isMuted: isAudioMuted,
    isVideoOff: isVideoOff,
    isScreenSharing: isScreenSharing,
    isHost: isHost,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col min-h-0">
        {/* Top Meeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
              title="Return to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {meeting?.title || 'ConnectSphere Room'}
                </h1>
                {isHost && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Host
                  </span>
                )}
              </div>

              {/* Room Code & Security Badges */}
              <div className="flex items-center gap-3 mt-0.5 text-xs">
                <div className="flex items-center gap-1.5 font-mono text-brand-400 font-semibold">
                  <span>{roomCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Copy room code"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <span className="text-slate-600">&bull;</span>

                <div
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400"
                  title="WebRTC DTLS-SRTP Media Encryption"
                >
                  <Lock className="w-3 h-3" />
                  <span>DTLS-SRTP Encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Status & Fast Action */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                connectionState === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : connectionState === 'reconnecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <Radio
                className={`w-3 h-3 ${
                  connectionState === 'connected' ? 'animate-pulse text-emerald-400' : 'text-amber-400'
                }`}
              />
              <span className="capitalize">{connectionState}</span>
            </div>

            <button
              type="button"
              onClick={handleLeave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {isSocketLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-400">Connecting to real-time conference...</p>
          </div>
        ) : socketError ? (
          <div className="max-w-md mx-auto my-auto p-8 rounded-3xl bg-slate-900 border border-rose-900/60 text-center shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Unable to Join Meeting</h3>
            <p className="text-xs text-slate-400 mb-6">{socketError}</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        ) : (
          /* Live Conference Layout */
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 mb-4 overflow-hidden">
            {/* Main Video Stage */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              <VideoGrid
                localParticipant={localParticipantData}
                remoteParticipants={remoteParticipantsData}
              />
            </div>

            {/* Collapsible Participant Sidebar */}
            {showParticipantsPanel && (
              <aside className="w-full lg:w-80 rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col shadow-xl flex-shrink-0 max-h-[340px] lg:max-h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-400" />
                      Participants
                    </h3>
                    <p className="text-[11px] text-slate-400">In this call</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {participants.length}
                  </span>
                </div>

                <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto pr-1">
                  {participants.map((p) => {
                    const isCurrentUser = p.userId === user?.id;
                    const mediaState = remoteMediaStates.get(p.userId);
                    const isMuted = isCurrentUser
                      ? isAudioMuted
                      : mediaState
                      ? !mediaState.audioEnabled
                      : false;
                    const isVideoOffState = isCurrentUser
                      ? isVideoOff
                      : mediaState
                      ? !mediaState.videoEnabled
                      : false;
                    const isSharing = isCurrentUser
                      ? isScreenSharing
                      : !!mediaState?.screenSharing;

                    return (
                      <div
                        key={p.userId}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                p.presence === 'in_meeting'
                                  ? 'bg-emerald-500'
                                  : p.presence === 'reconnecting'
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-slate-400'
                              }`}
                            />
                          </div>

                          <div className="truncate">
                            <div className="flex items-center gap-1.5 font-semibold text-white truncate">
                              <span className="truncate">{p.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-normal text-slate-400">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{p.email}</div>
                          </div>
                        </div>

                        {/* Media Indicators & Role */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSharing && (
                            <span title="Sharing screen">
                              <Monitor className="w-3.5 h-3.5 text-sky-400" />
                            </span>
                          )}

                          {isMuted ? (
                            <span title="Microphone muted">
                              <MicOff className="w-3.5 h-3.5 text-rose-400" />
                            </span>
                          ) : (
                            <span title="Microphone active">
                              <Mic className="w-3.5 h-3.5 text-emerald-400" />
                            </span>
                          )}

                          {isVideoOffState && (
                            <span title="Camera is off">
                              <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                            </span>
                          )}

                          {p.role === 'HOST' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              Host
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Bottom Meeting Control Bar */}
        {hasJoinedRoom && !socketError && (
          <div className="pt-2">
            <MeetingControls
              isAudioMuted={isAudioMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              isHost={isHost}
              participantCount={participants.length}
              showParticipants={showParticipantsPanel}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onToggleScreenShare={toggleScreenShare}
              onToggleParticipants={() => setShowParticipantsPanel((prev) => !prev)}
              onLeaveMeeting={handleLeave}
              onEndMeeting={handleEnd}
              isEnding={isEnding}
            />
          </div>
        )}
      </main>

      {/* Meeting Concluded Modal */}
      {meetingEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <Square className="w-6 h-6 fill-current" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Meeting Concluded</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {meetingEnded.message}. Thank you for using ConnectSphere.
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};