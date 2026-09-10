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
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
}

export interface SignalingPayload {
  targetUserId: string;
  targetSocketId?: string;
  roomCode: string;
}

export interface OfferPayload extends SignalingPayload {
  sdp: any;
}

export interface AnswerPayload extends SignalingPayload {
  sdp: any;
}

export interface IceCandidatePayload extends SignalingPayload {
  candidate: any;
}

export interface MediaStatePayload {
  roomCode: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
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
  // WebRTC Signaling
  'webrtc:offer': (payload: OfferPayload, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'webrtc:answer': (payload: AnswerPayload, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'webrtc:ice-candidate': (payload: IceCandidatePayload, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'media:state-changed': (payload: MediaStatePayload) => void;
}

export interface ServerToClientEvents {
  'participant:joined': (participant: RoomParticipant) => void;
  'participant:left': (payload: { userId: string; socketId: string; roomCode: string }) => void;
  'participant:updated': (participant: RoomParticipant) => void;
  'meeting:ended': (payload: { roomCode: string; message: string; endedAt: string }) => void;
  'presence:updated': (payload: { userId: string; name: string; presence: PresenceState; roomCode?: string }) => void;
  // WebRTC Signaling
  'webrtc:offer': (payload: { senderUserId: string; senderSocketId: string; sdp: any; roomCode: string }) => void;
  'webrtc:answer': (payload: { senderUserId: string; senderSocketId: string; sdp: any; roomCode: string }) => void;
  'webrtc:ice-candidate': (payload: { senderUserId: string; senderSocketId: string; candidate: any; roomCode: string }) => void;
  'media:state-changed': (payload: { userId: string; audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean; roomCode: string }) => void;
  'error': (payload: { message: string; code?: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user: SafeUser;
  currentRoomCode?: string;
  currentMeetingId?: string;
}