import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import { peerConnectionManager, ConnectionQuality } from '../services/peerConnectionManager';

export interface RemoteMediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  connectionQualities: Map<string, ConnectionQuality>;
  remoteMediaStates: Map<string, RemoteMediaState>;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  mediaError: string | null;
  acquireLocalMedia: (withAudio?: boolean, withVideo?: boolean) => Promise<MediaStream | null>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  stopAllMedia: () => void;
  connectToPeer: (targetUserId: string) => Promise<void>;
}

export function useWebRTC(
  roomCode: string | undefined,
  currentUserId: string | undefined
): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionQualities, setConnectionQualities] = useState<Map<string, ConnectionQuality>>(new Map());
  const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep localStreamRef synchronized
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Peer Connection Callbacks factory
  const createPeerCallbacks = useCallback(
    (_targetUserId?: string) => ({
      onRemoteStream: (userId: string, stream: MediaStream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(userId, stream);
          return next;
        });
      },
      onIceCandidate: (userId: string, candidate: RTCIceCandidate) => {
        if (!roomCode) return;
        const socket = socketService.getSocket();
        socket.emit('webrtc:ice-candidate', {
          targetUserId: userId,
          roomCode,
          candidate: candidate.toJSON(),
        });
      },
      onQualityChange: (userId: string, quality: ConnectionQuality) => {
        setConnectionQualities((prev) => {
          const next = new Map(prev);
          next.set(userId, quality);
          return next;
        });
      },
    }),
    [roomCode]
  );

  // Request Local Media
  const acquireLocalMedia = useCallback(
    async (withAudio = true, withVideo = true): Promise<MediaStream | null> => {
      setMediaError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support WebRTC camera and microphone access.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: withAudio,
          video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        });

        // Apply initial toggle states
        const audioTracks = stream.getAudioTracks();
        if (audioTracks[0]) audioTracks[0].enabled = !isAudioMuted;

        const videoTracks = stream.getVideoTracks();
        if (videoTracks[0]) videoTracks[0].enabled = !isVideoOff;

        peerConnectionManager.setLocalStream(stream);
        setLocalStream(stream);
        return stream;
      } catch (err: any) {
        console.warn('[useWebRTC] Media acquisition issue:', err.name || err.message);
        let message = 'Could not access media devices.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera or microphone access was denied. Please allow permissions in your browser bar.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No camera or microphone found on this device.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera or microphone is already in use by another application.';
        }
        setMediaError(message);
        return null;
      }
    },
    [isAudioMuted, isVideoOff]
  );

  // Connect to a new peer as offer initiator
  const connectToPeer = useCallback(
    async (targetUserId: string) => {
      if (!roomCode || targetUserId === currentUserId) return;
      try {
        const callbacks = createPeerCallbacks(targetUserId);
        const offer = await peerConnectionManager.createOffer(targetUserId, callbacks);
        const socket = socketService.getSocket();

        socket.emit('webrtc:offer', {
          targetUserId,
          roomCode,
          sdp: offer,
        });
      } catch (err) {
        console.error('[useWebRTC] Error creating offer to peer:', err);
      }
    },
    [roomCode, currentUserId, createPeerCallbacks]
  );

  // Toggle Audio (Mute / Unmute)
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = newState));
        setIsAudioMuted(!newState);

        if (roomCode) {
          socketService.getSocket().emit('media:state-changed', {
            roomCode,
            audioEnabled: newState,
            videoEnabled: !isVideoOff,
            screenSharing: isScreenSharing,
          });
        }
      }
    }
  }, [roomCode, isVideoOff, isScreenSharing]);

  // Toggle Video (Camera Off / Camera On)
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = newState));
        setIsVideoOff(!newState);

        if (roomCode) {
          socketService.getSocket().emit('media:state-changed', {
            roomCode,
            audioEnabled: !isAudioMuted,
            videoEnabled: newState,
            screenSharing: isScreenSharing,
          });
        }
      }
    }
  }, [roomCode, isAudioMuted, isScreenSharing]);

  // Screen Sharing
  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    // Restore original camera track on peers
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    await peerConnectionManager.replaceVideoTrack(cameraTrack);

    if (roomCode) {
      socketService.getSocket().emit('media:state-changed', {
        roomCode,
        audioEnabled: !isAudioMuted,
        videoEnabled: !isVideoOff,
        screenSharing: false,
      });
    }
  }, [roomCode, isAudioMuted, isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen sharing is not supported by your current browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      const screenTrack = stream.getVideoTracks()[0];

      // Handle user ending screen share via browser stop button
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // Replace video track across active peer connections
      await peerConnectionManager.replaceVideoTrack(screenTrack);
      setIsScreenSharing(true);

      if (roomCode) {
        socketService.getSocket().emit('media:state-changed', {
          roomCode,
          audioEnabled: !isAudioMuted,
          videoEnabled: !isVideoOff,
          screenSharing: true,
        });
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn('[useWebRTC] Screen sharing cancelled or failed:', err);
      }
    }
  }, [isScreenSharing, stopScreenShare, roomCode, isAudioMuted, isVideoOff]);

  // Stop all media tracks
  const stopAllMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    peerConnectionManager.closeAll();
    setRemoteStreams(new Map());
    setConnectionQualities(new Map());
  }, []);

  // WebRTC Socket Event Handlers
  useEffect(() => {
    if (!roomCode) return;
    const socket = socketService.getSocket();

    // 1. Inbound Offer: create and send Answer
    const handleOffer = async (payload: { senderUserId: string; sdp: RTCSessionDescriptionInit; roomCode: string }) => {
      if (payload.roomCode !== roomCode || payload.senderUserId === currentUserId) return;
      try {
        const callbacks = createPeerCallbacks(payload.senderUserId);
        const answer = await peerConnectionManager.handleOffer(payload.senderUserId, payload.sdp, callbacks);
        socket.emit('webrtc:answer', {
          targetUserId: payload.senderUserId,
          roomCode,
          sdp: answer,
        });
      } catch (err) {
        console.error('[useWebRTC] Error handling inbound offer:', err);
      }
    };

    // 2. Inbound Answer: set remote description
    const handleAnswer = async (payload: { senderUserId: string; sdp: RTCSessionDescriptionInit; roomCode: string }) => {
      if (payload.roomCode !== roomCode) return;
      try {
        await peerConnectionManager.handleAnswer(payload.senderUserId, payload.sdp);
      } catch (err) {
        console.error('[useWebRTC] Error handling inbound answer:', err);
      }
    };

    // 3. Inbound ICE Candidate
    const handleIceCandidate = async (payload: { senderUserId: string; candidate: RTCIceCandidateInit; roomCode: string }) => {
      if (payload.roomCode !== roomCode) return;
      try {
        await peerConnectionManager.handleIceCandidate(payload.senderUserId, payload.candidate);
      } catch (err) {
        console.error('[useWebRTC] Error handling inbound ICE candidate:', err);
      }
    };

    // 4. Remote Participant Media State Changed
    const handleMediaStateChanged = (payload: { userId: string; audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean; roomCode: string }) => {
      if (payload.roomCode !== roomCode) return;
      setRemoteMediaStates((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, {
          audioEnabled: payload.audioEnabled,
          videoEnabled: payload.videoEnabled,
          screenSharing: payload.screenSharing,
        });
        return next;
      });
    };

    // 5. Participant joined: existing room peers initiate WebRTC connection
    const handleParticipantJoined = (payload: { userId: string }) => {
      if (payload.userId !== currentUserId) {
        connectToPeer(payload.userId);
      }
    };

    // 6. Participant left: close corresponding peer connection
    const handleParticipantLeft = (payload: { userId: string }) => {
      peerConnectionManager.closePeer(payload.userId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
      setConnectionQualities((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
      setRemoteMediaStates((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('media:state-changed', handleMediaStateChanged);
    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('media:state-changed', handleMediaStateChanged);
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      stopAllMedia();
    };
  }, [roomCode, currentUserId, createPeerCallbacks, connectToPeer, stopAllMedia]);

  return {
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
    connectToPeer,
  };
}