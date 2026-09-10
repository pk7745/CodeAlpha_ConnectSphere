import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService, RoomParticipant, PresenceState } from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';

export interface UseMeetingSocketReturn {
  meeting: any | null;
  participants: RoomParticipant[];
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  meetingEnded: { message: string; endedAt: string } | null;
  leaveMeeting: () => Promise<void>;
  endMeeting: () => Promise<void>;
  setPresence: (presence: PresenceState) => void;
}

export function useMeetingSocket(roomCode: string | undefined): UseMeetingSocketReturn {
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<any | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingEnded, setMeetingEnded] = useState<{ message: string; endedAt: string } | null>(null);

  const isJoinedRef = useRef(false);

  const joinRoom = useCallback(() => {
    if (!roomCode) return;
    setIsLoading(true);
    setError(null);

    socketService.joinMeeting(roomCode, (res) => {
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Failed to join meeting room');
        return;
      }

      setMeeting(res.meeting);
      setParticipants(res.participants || []);
      isJoinedRef.current = true;
    });
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    // Track connection state
    const unsubscribeState = socketService.onStateChange((state) => {
      setConnectionState(state);
      if (state === 'connected' && isJoinedRef.current) {
        // Re-join on reconnect to synchronize presence
        joinRoom();
      }
    });

    const socket = socketService.init();

    // Initial Join
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', () => {
        joinRoom();
      });
    }

    // Event Listeners
    const handleParticipantJoined = (participant: RoomParticipant) => {
      setParticipants((prev) => {
        const existingIdx = prev.findIndex((p) => p.userId === participant.userId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = participant;
          return updated;
        }
        return [...prev, participant];
      });
    };

    const handleParticipantLeft = (payload: { userId: string; socketId: string; roomCode: string }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
    };

    const handleParticipantUpdated = (participant: RoomParticipant) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === participant.userId ? participant : p))
      );
    };

    const handlePresenceUpdated = (payload: { userId: string; name: string; presence: PresenceState; roomCode?: string }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === payload.userId ? { ...p, presence: payload.presence } : p))
      );
    };

    const handleMeetingEnded = (payload: { roomCode: string; message: string; endedAt: string }) => {
      setMeetingEnded({
        message: payload.message,
        endedAt: payload.endedAt,
      });
    };

    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('participant:updated', handleParticipantUpdated);
    socket.on('presence:updated', handlePresenceUpdated);
    socket.on('meeting:ended', handleMeetingEnded);

    return () => {
      unsubscribeState();
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('participant:updated', handleParticipantUpdated);
      socket.off('presence:updated', handlePresenceUpdated);
      socket.off('meeting:ended', handleMeetingEnded);

      if (roomCode) {
        socketService.leaveMeeting(roomCode);
      }
      isJoinedRef.current = false;
    };
  }, [roomCode, joinRoom]);

  const leaveMeeting = useCallback(async () => {
    if (roomCode) {
      return new Promise<void>((resolve) => {
        socketService.leaveMeeting(roomCode, () => resolve());
      });
    }
  }, [roomCode]);

  const endMeeting = useCallback(async () => {
    if (roomCode) {
      return new Promise<void>((resolve, reject) => {
        socketService.endMeeting(roomCode, (res) => {
          if (res.success) resolve();
          else reject(new Error(res.error || 'Failed to end meeting'));
        });
      });
    }
  }, [roomCode]);

  const setPresence = useCallback(
    (presence: PresenceState) => {
      socketService.updatePresence(presence, roomCode);
    },
    [roomCode]
  );

  const isHost = meeting?.host?.id === user?.id || meeting?.isHost === true;

  return {
    meeting,
    participants,
    connectionState,
    isHost,
    isLoading,
    error,
    meetingEnded,
    leaveMeeting,
    endMeeting,
    setPresence,
  };
}