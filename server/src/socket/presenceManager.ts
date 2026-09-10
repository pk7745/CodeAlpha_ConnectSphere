import { RoomParticipant, PresenceState } from './types';

class PresenceManager {
  // roomCode -> Map<userId, RoomParticipant>
  private rooms = new Map<string, Map<string, RoomParticipant>>();

  // socketId -> roomCode
  private socketToRoom = new Map<string, string>();

  // userId -> Set<socketId>
  private userToSockets = new Map<string, Set<string>>();

  // socketId -> userId
  private socketToUser = new Map<string, string>();

  // Track socket connection
  public registerSocket(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);

    let sockets = this.userToSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userToSockets.set(userId, sockets);
    }
    sockets.add(socketId);
  }

  // Add or update participant in room
  public addParticipant(roomCode: string, participant: RoomParticipant): void {
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = new Map();
      this.rooms.set(roomCode, room);
    }

    room.set(participant.userId, participant);
    this.socketToRoom.set(participant.socketId, roomCode);
  }

  // Remove participant from room
  public removeParticipant(roomCode: string, userId: string): RoomParticipant | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;

    const participant = room.get(userId);
    room.delete(userId);

    if (room.size === 0) {
      this.rooms.delete(roomCode);
    }

    return participant;
  }

  // Get participant by user ID in room
  public getParticipant(roomCode: string, userId: string): RoomParticipant | undefined {
    const room = this.rooms.get(roomCode);
    return room ? room.get(userId) : undefined;
  }

  // Update presence status for a user in a room
  public updatePresence(
    roomCode: string,
    userId: string,
    presence: PresenceState
  ): RoomParticipant | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;

    const participant = room.get(userId);
    if (participant) {
      participant.presence = presence;
      return participant;
    }
    return undefined;
  }

  // Get all participants currently in room
  public getRoomParticipants(roomCode: string): RoomParticipant[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.values());
  }

  // Get room associated with socket
  public getSocketRoom(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  // Clean up socket mapping on disconnect
  public removeSocket(socketId: string): { roomCode?: string; userId?: string } {
    const roomCode = this.socketToRoom.get(socketId);
    const userId = this.socketToUser.get(socketId);

    this.socketToRoom.delete(socketId);
    this.socketToUser.delete(socketId);

    if (userId) {
      const userSockets = this.userToSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userToSockets.delete(userId);
        }
      }
    }

    return { roomCode, userId };
  }

  // Clean up entire room after end
  public clearRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      for (const p of room.values()) {
        this.socketToRoom.delete(p.socketId);
      }
      this.rooms.delete(roomCode);
    }
  }
}

export const presenceManager = new PresenceManager();