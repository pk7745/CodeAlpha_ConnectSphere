import { SafeUser } from '../utils/sanitize';

export type PresenceState = 'online' | 'in_meeting' | 'away' | 'reconnecting' | 'connected';

export interface RoomParticipant {
  userId: string;
  socketId: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'HOST' | 'PARTICIPANT' | string;
  presence: PresenceState;
  joinedAt: string;
}

export interface ClientToServerEvents {
  'meeting:join': (
    payload: { roomCode: string },
    callback?: (response: { success: boolean; error?: string; meeting?: any; participants?: RoomParticipant[] }) => void
  ) => void;
  'meeting:leave': (
    payload: { roomCode: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
  'meeting:end': (
    payload: { roomCode: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
  'presence:update': (
    payload: { presence: PresenceState; roomCode?: string }
  ) => void;
}

export interface ServerToClientEvents {
  'participant:joined': (participant: RoomParticipant) => void;
  'participant:left': (payload: { userId: string; socketId: string; roomCode: string }) => void;
  'participant:updated': (participant: RoomParticipant) => void;
  'meeting:ended': (payload: { roomCode: string; message: string; endedAt: string }) => void;
  'presence:updated': (payload: { userId: string; name: string; presence: PresenceState; roomCode?: string }) => void;
  'error': (payload: { message: string; code?: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user: SafeUser;
  currentRoomCode?: string;
  currentMeetingId?: string;
}