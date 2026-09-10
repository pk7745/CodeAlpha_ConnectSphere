import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { presenceManager } from './presenceManager';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  RoomParticipant,
} from './types';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerMeetingHandlers(io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;
  presenceManager.registerSocket(socket.id, user.id);

  // 1. Join Meeting Room
  socket.on('meeting:join', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : undefined;
      if (!roomCode) {
        if (callback) callback({ success: false, error: 'Room code is required' });
        return;
      }

      // Verify meeting in database
      const meeting = await prisma.meeting.findUnique({
        where: { roomCode },
        include: {
          host: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      if (!meeting) {
        if (callback) callback({ success: false, error: 'Meeting not found' });
        return;
      }

      if (meeting.status !== 'ACTIVE') {
        if (callback) callback({ success: false, error: 'Meeting has already ended' });
        return;
      }

      const isHost = meeting.hostId === user.id;
      const role = isHost ? 'HOST' : 'PARTICIPANT';

      // Persist or update participant in database
      await prisma.meetingParticipant.upsert({
        where: {
          meetingId_userId: {
            meetingId: meeting.id,
            userId: user.id,
          },
        },
        update: {
          leftAt: null,
          joinedAt: new Date(),
        },
        create: {
          meetingId: meeting.id,
          userId: user.id,
          role,
          joinedAt: new Date(),
        },
      });

      // Join Socket.IO room channel
      socket.join(roomCode);
      socket.data.currentRoomCode = roomCode;
      socket.data.currentMeetingId = meeting.id;

      // Register participant in in-memory state
      const participant: RoomParticipant = {
        userId: user.id,
        socketId: socket.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role,
        presence: 'in_meeting',
        joinedAt: new Date().toISOString(),
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
      };

      presenceManager.addParticipant(roomCode, participant);

      // Notify other participants in the room
      socket.to(roomCode).emit('participant:joined', participant);
      socket.to(roomCode).emit('presence:updated', {
        userId: user.id,
        name: user.name,
        presence: 'in_meeting',
        roomCode,
      });

      // Send full room state back to joining client
      const allParticipants = presenceManager.getRoomParticipants(roomCode);
      if (callback) {
        callback({
          success: true,
          meeting: {
            id: meeting.id,
            roomCode: meeting.roomCode,
            title: meeting.title,
            status: meeting.status,
            createdAt: meeting.createdAt.toISOString(),
            host: meeting.host,
            isHost,
          },
          participants: allParticipants,
        });
      }
    } catch (error) {
      console.error('[Socket meeting:join] Error:', error);
      if (callback) callback({ success: false, error: 'Internal error joining meeting' });
    }
  });

  // 2. Leave Meeting Room
  socket.on('meeting:leave', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (!roomCode) {
        if (callback) callback({ success: false, error: 'Room code required' });
        return;
      }

      await handleUserLeaveRoom(io, socket, roomCode);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[Socket meeting:leave] Error:', error);
      if (callback) callback({ success: false, error: 'Internal error leaving meeting' });
    }
  });

  // 3. End Meeting (Host Only)
  socket.on('meeting:end', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (!roomCode) {
        if (callback) callback({ success: false, error: 'Room code required' });
        return;
      }

      const meeting = await prisma.meeting.findUnique({
        where: { roomCode },
        select: { id: true, hostId: true, status: true },
      });

      if (!meeting) {
        if (callback) callback({ success: false, error: 'Meeting not found' });
        return;
      }

      if (meeting.hostId !== user.id) {
        if (callback) callback({ success: false, error: 'Only the host can end the meeting' });
        return;
      }

      const endedAt = new Date();
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: 'ENDED',
          endedAt,
        },
      });

      // Broadcast meeting:ended event to all sockets in room
      io.to(roomCode).emit('meeting:ended', {
        roomCode,
        message: 'The meeting has been concluded by the host',
        endedAt: endedAt.toISOString(),
      });

      // Clean up in-memory room tracking
      presenceManager.clearRoom(roomCode);

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[Socket meeting:end] Error:', error);
      if (callback) callback({ success: false, error: 'Internal error ending meeting' });
    }
  });

  // 4. Presence Update
  socket.on('presence:update', (payload) => {
    try {
      const roomCode = payload?.roomCode || socket.data.currentRoomCode;
      const presence = payload?.presence || 'online';

      if (roomCode) {
        presenceManager.updatePresence(roomCode, user.id, presence);
        io.to(roomCode).emit('presence:updated', {
          userId: user.id,
          name: user.name,
          presence,
          roomCode,
        });
      }
    } catch (error) {
      console.error('[Socket presence:update] Error:', error);
    }
  });

  // 5. WebRTC: Offer Forwarding
  socket.on('webrtc:offer', (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      const targetUserId = payload?.targetUserId;

      if (!roomCode || !targetUserId || !payload.sdp) {
        if (callback) callback({ success: false, error: 'Invalid offer payload' });
        return;
      }

      const senderParticipant = presenceManager.getParticipant(roomCode, user.id);
      if (!senderParticipant) {
        if (callback) callback({ success: false, error: 'Sender not authorized in this room' });
        return;
      }

      const targetParticipant = presenceManager.getParticipant(roomCode, targetUserId);
      if (!targetParticipant) {
        if (callback) callback({ success: false, error: 'Target participant not found in room' });
        return;
      }

      // Forward offer directly to target socket
      io.to(targetParticipant.socketId).emit('webrtc:offer', {
        senderUserId: user.id,
        senderSocketId: socket.id,
        sdp: payload.sdp,
        roomCode,
      });

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[Socket webrtc:offer] Error:', error);
      if (callback) callback({ success: false, error: 'Error forwarding offer' });
    }
  });

  // 6. WebRTC: Answer Forwarding
  socket.on('webrtc:answer', (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      const targetUserId = payload?.targetUserId;

      if (!roomCode || !targetUserId || !payload.sdp) {
        if (callback) callback({ success: false, error: 'Invalid answer payload' });
        return;
      }

      const senderParticipant = presenceManager.getParticipant(roomCode, user.id);
      if (!senderParticipant) {
        if (callback) callback({ success: false, error: 'Sender not authorized in this room' });
        return;
      }

      const targetParticipant = presenceManager.getParticipant(roomCode, targetUserId);
      if (!targetParticipant) {
        if (callback) callback({ success: false, error: 'Target participant not found in room' });
        return;
      }

      // Forward answer directly to target socket
      io.to(targetParticipant.socketId).emit('webrtc:answer', {
        senderUserId: user.id,
        senderSocketId: socket.id,
        sdp: payload.sdp,
        roomCode,
      });

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[Socket webrtc:answer] Error:', error);
      if (callback) callback({ success: false, error: 'Error forwarding answer' });
    }
  });

  // 7. WebRTC: ICE Candidate Forwarding
  socket.on('webrtc:ice-candidate', (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      const targetUserId = payload?.targetUserId;

      if (!roomCode || !targetUserId || !payload.candidate) {
        if (callback) callback({ success: false, error: 'Invalid ICE candidate payload' });
        return;
      }

      const senderParticipant = presenceManager.getParticipant(roomCode, user.id);
      if (!senderParticipant) {
        if (callback) callback({ success: false, error: 'Sender not authorized in this room' });
        return;
      }

      const targetParticipant = presenceManager.getParticipant(roomCode, targetUserId);
      if (!targetParticipant) {
        if (callback) callback({ success: false, error: 'Target participant not found in room' });
        return;
      }

      // Forward ICE candidate to target socket
      io.to(targetParticipant.socketId).emit('webrtc:ice-candidate', {
        senderUserId: user.id,
        senderSocketId: socket.id,
        candidate: payload.candidate,
        roomCode,
      });

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[Socket webrtc:ice-candidate] Error:', error);
      if (callback) callback({ success: false, error: 'Error forwarding ICE candidate' });
    }
  });

  // 8. Media Track State Changed
  socket.on('media:state-changed', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode) {
        presenceManager.updateMediaState(roomCode, user.id, {
          audioEnabled: payload.audioEnabled,
          videoEnabled: payload.videoEnabled,
          screenSharing: payload.screenSharing,
        });

        socket.to(roomCode).emit('media:state-changed', {
          userId: user.id,
          audioEnabled: payload.audioEnabled,
          videoEnabled: payload.videoEnabled,
          screenSharing: payload.screenSharing,
          roomCode,
        });
      }
    } catch (error) {
      console.error('[Socket media:state-changed] Error:', error);
    }
  });

  // 9. Real-Time Chat Message
  socket.on('chat:send', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      const content = typeof payload?.content === 'string' ? payload.content.trim() : '';

      if (!roomCode || !content) {
        if (callback) callback({ success: false, error: 'Room code and message content are required' });
        return;
      }

      if (content.length > 2000) {
        if (callback) callback({ success: false, error: 'Message cannot exceed 2000 characters' });
        return;
      }

      const participant = presenceManager.getParticipant(roomCode, user.id);
      if (!participant) {
        if (callback) callback({ success: false, error: 'You must be in the meeting to send messages' });
        return;
      }

      const meetingId = socket.data.currentMeetingId || (await prisma.meeting.findUnique({ where: { roomCode }, select: { id: true } }))?.id;
      if (!meetingId) {
        if (callback) callback({ success: false, error: 'Meeting not found' });
        return;
      }

      const message = await prisma.chatMessage.create({
        data: {
          meetingId,
          senderId: user.id,
          senderName: user.name,
          content,
        },
      });

      const messagePayload = {
        id: message.id,
        meetingId: message.meetingId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      };

      io.to(roomCode).emit('chat:received', messagePayload);
      if (callback) callback({ success: true, message: messagePayload });
    } catch (error) {
      console.error('[Socket chat:send] Error:', error);
      if (callback) callback({ success: false, error: 'Failed to send message' });
    }
  });

  // 10. Collaborative Whiteboard Drawing
  socket.on('whiteboard:draw', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload.stroke) {
        socket.to(roomCode).emit('whiteboard:draw', {
          stroke: payload.stroke,
          senderUserId: user.id,
        });
      }
    } catch (error) {
      console.error('[Socket whiteboard:draw] Error:', error);
    }
  });

  // 11. Whiteboard Clear
  socket.on('whiteboard:clear', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode) {
        const meetingId = socket.data.currentMeetingId || (await prisma.meeting.findUnique({ where: { roomCode }, select: { id: true } }))?.id;
        if (meetingId) {
          await prisma.whiteboardState.upsert({
            where: { meetingId },
            update: { strokesJson: '[]' },
            create: { meetingId, strokesJson: '[]' },
          });
        }
        io.to(roomCode).emit('whiteboard:clear');
        if (callback) callback({ success: true });
      }
    } catch (error) {
      console.error('[Socket whiteboard:clear] Error:', error);
      if (callback) callback({ success: false });
    }
  });

  // 12. Whiteboard Sync & Persistence
  socket.on('whiteboard:sync', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload.strokesJson) {
        const meetingId = socket.data.currentMeetingId || (await prisma.meeting.findUnique({ where: { roomCode }, select: { id: true } }))?.id;
        if (meetingId) {
          await prisma.whiteboardState.upsert({
            where: { meetingId },
            update: { strokesJson: payload.strokesJson },
            create: { meetingId, strokesJson: payload.strokesJson },
          });
        }
        socket.to(roomCode).emit('whiteboard:sync', {
          strokesJson: payload.strokesJson,
          senderUserId: user.id,
        });
        if (callback) callback({ success: true });
      }
    } catch (error) {
      console.error('[Socket whiteboard:sync] Error:', error);
      if (callback) callback({ success: false });
    }
  });

  // 13. Meeting Note Update
  socket.on('note:update', async (payload, callback) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && typeof payload.content === 'string') {
        const meetingId = socket.data.currentMeetingId || (await prisma.meeting.findUnique({ where: { roomCode }, select: { id: true } }))?.id;
        if (meetingId) {
          await prisma.meetingNote.upsert({
            where: { meetingId },
            update: { content: payload.content },
            create: { meetingId, content: payload.content },
          });
        }
        socket.to(roomCode).emit('note:updated', {
          content: payload.content,
          updatedBy: user.name,
        });
        if (callback) callback({ success: true });
      }
    } catch (error) {
      console.error('[Socket note:update] Error:', error);
      if (callback) callback({ success: false });
    }
  });

  // 14. Agenda Sync Trigger
  socket.on('agenda:update', async (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode) {
        const meeting = await prisma.meeting.findUnique({
          where: { roomCode },
          include: { agendaItems: { orderBy: { order: 'asc' } } },
        });
        if (meeting) {
          io.to(roomCode).emit('agenda:updated', { items: meeting.agendaItems });
        }
      }
    } catch (error) {
      console.error('[Socket agenda:update] Error:', error);
    }
  });

  // 15. Action Items Sync Trigger
  socket.on('action:update', async (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode) {
        const meeting = await prisma.meeting.findUnique({
          where: { roomCode },
          include: { actionItems: { orderBy: { createdAt: 'desc' } } },
        });
        if (meeting) {
          io.to(roomCode).emit('action:updated', { items: meeting.actionItems });
        }
      }
    } catch (error) {
      console.error('[Socket action:update] Error:', error);
    }
  });

  // 16. In-Meeting Reaction Broadcast (Phase 9)
  socket.on('reaction:send', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload?.emoji) {
        io.to(roomCode).emit('reaction:received', {
          emoji: payload.emoji,
          senderId: user.id,
          senderName: user.name,
        });
      }
    } catch (error) {
      console.error('[Socket reaction:send] Error:', error);
    }
  });

  // 17. Real-Time Poll Events (Phase 9)
  socket.on('poll:created', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload?.poll) {
        io.to(roomCode).emit('poll:created', { poll: payload.poll });
      }
    } catch (error) {
      console.error('[Socket poll:created] Error:', error);
    }
  });

  socket.on('poll:voted', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload?.pollId) {
        io.to(roomCode).emit('poll:voted', {
          pollId: payload.pollId,
          optionIdx: payload.optionIdx,
          userId: user.id,
          voteCounts: payload.voteCounts,
        });
      }
    } catch (error) {
      console.error('[Socket poll:voted] Error:', error);
    }
  });

  socket.on('poll:closed', (payload) => {
    try {
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : socket.data.currentRoomCode;
      if (roomCode && payload?.pollId) {
        io.to(roomCode).emit('poll:closed', { pollId: payload.pollId });
      }
    } catch (error) {
      console.error('[Socket poll:closed] Error:', error);
    }
  });

  // 18. Disconnect Handler
  socket.on('disconnect', async () => {
    try {
      const roomCode = socket.data.currentRoomCode || presenceManager.getSocketRoom(socket.id);
      if (roomCode) {
        await handleUserLeaveRoom(io, socket, roomCode);
      }
      presenceManager.removeSocket(socket.id);
    } catch (error) {
      console.error('[Socket disconnect] Error:', error);
    }
  });
}

async function handleUserLeaveRoom(
  io: TypedServer,
  socket: TypedSocket,
  roomCode: string
): Promise<void> {
  const user = socket.data.user;
  presenceManager.removeParticipant(roomCode, user.id);

  socket.leave(roomCode);
  socket.data.currentRoomCode = undefined;

  // Persist leftAt in database
  if (socket.data.currentMeetingId) {
    await prisma.meetingParticipant.updateMany({
      where: {
        meetingId: socket.data.currentMeetingId,
        userId: user.id,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  // Notify remaining participants
  io.to(roomCode).emit('participant:left', {
    userId: user.id,
    socketId: socket.id,
    roomCode,
  });

  io.to(roomCode).emit('presence:updated', {
    userId: user.id,
    name: user.name,
    presence: 'online',
    roomCode,
  });
}