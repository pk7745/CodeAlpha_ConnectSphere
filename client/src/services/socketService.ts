import { io, Socket } from 'socket.io-client';

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

class SocketService {
  private socket: Socket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private stateListeners: Set<(state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void> = new Set();

  public getSocket(): Socket {
    if (!this.socket) {
      this.init();
    }
    return this.socket!;
  }

  public init(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const token = localStorage.getItem('connectsphere_token') || '';
    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || (import.meta.env.VITE_API_URL as string) || undefined;

    this.connectionState = 'connecting';
    this.notifyState();

    const socketOptions = {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    };

    this.socket = socketUrl ? io(socketUrl, socketOptions) : io(socketOptions);

    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.notifyState();
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState = reason === 'io client disconnect' ? 'disconnected' : 'reconnecting';
      this.notifyState();
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketService] Connection error:', err.message);
      this.connectionState = 'disconnected';
      this.notifyState();
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionState = 'reconnecting';
      this.notifyState();
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.notifyState();
  }

  public getConnectionState() {
    return this.connectionState;
  }

  public onStateChange(listener: (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void) {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState() {
    for (const listener of this.stateListeners) {
      listener(this.connectionState);
    }
  }

  public joinMeeting(
    roomCode: string,
    callback?: (res: { success: boolean; error?: string; meeting?: any; participants?: RoomParticipant[] }) => void
  ): void {
    const s = this.getSocket();
    s.emit('meeting:join', { roomCode }, callback);
  }

  public leaveMeeting(
    roomCode: string,
    callback?: (res: { success: boolean; error?: string }) => void
  ): void {
    if (this.socket) {
      this.socket.emit('meeting:leave', { roomCode }, callback);
    }
  }

  public endMeeting(
    roomCode: string,
    callback?: (res: { success: boolean; error?: string }) => void
  ): void {
    if (this.socket) {
      this.socket.emit('meeting:end', { roomCode }, callback);
    }
  }

  public updatePresence(presence: PresenceState, roomCode?: string): void {
    if (this.socket) {
      this.socket.emit('presence:update', { presence, roomCode });
    }
  }
}

export const socketService = new SocketService();