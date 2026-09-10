import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateUniqueRoomCode } from '../utils/roomCode';
import {
  createMeetingSchema,
  roomCodeParamSchema,
  meetingIdParamSchema,
} from '../validators/meetingValidators';

const SAFE_HOST_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

export async function createMeeting(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = createMeetingSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const userId = req.user!.id;
    const { title } = parseResult.data;

    // Generate guaranteed unique room code
    const roomCode = await generateUniqueRoomCode(prisma);

    // Create meeting and automatic HOST participant in single transaction
    const meeting = await prisma.meeting.create({
      data: {
        title,
        roomCode,
        hostId: userId,
        status: 'ACTIVE',
        participants: {
          create: {
            userId,
            role: 'HOST',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        host: { select: SAFE_HOST_SELECT },
        _count: {
          select: { participants: true },
        },
      },
    });

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting: {
        id: meeting.id,
        roomCode: meeting.roomCode,
        title: meeting.title,
        status: meeting.status,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
        host: meeting.host,
        participantCount: meeting._count.participants,
      },
    });
  } catch (error) {
    console.error('[MeetingController.createMeeting] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create meeting',
    });
  }
}

export async function getUserMeetings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Retrieve meetings where user is host or participant
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: SAFE_HOST_SELECT },
        participants: {
          where: { userId },
          select: { role: true, joinedAt: true },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    const formattedMeetings = meetings.map((m) => {
      const userParticipant = m.participants[0];
      const isHost = m.hostId === userId;
      return {
        id: m.id,
        roomCode: m.roomCode,
        title: m.title,
        status: m.status,
        createdAt: m.createdAt,
        endedAt: m.endedAt,
        host: m.host,
        isHost,
        userRole: userParticipant?.role || (isHost ? 'HOST' : 'PARTICIPANT'),
        participantCount: m._count.participants,
      };
    });

    res.status(200).json({
      meetings: formattedMeetings,
    });
  } catch (error) {
    console.error('[MeetingController.getUserMeetings] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve meeting history',
    });
  }
}

export async function getMeetingById(req: Request, res: Response): Promise<void> {
  try {
    const paramResult = meetingIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid meeting ID format',
      });
      return;
    }

    const { id } = paramResult.data;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        host: { select: SAFE_HOST_SELECT },
        participants: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Meeting not found',
      });
      return;
    }

    // Access authorization: user must be host or registered participant
    const isHost = meeting.hostId === userId;
    const isParticipant = meeting.participants.some((p) => p.userId === userId);

    if (!isHost && !isParticipant) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this meeting',
      });
      return;
    }

    res.status(200).json({
      meeting: {
        id: meeting.id,
        roomCode: meeting.roomCode,
        title: meeting.title,
        status: meeting.status,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
        host: meeting.host,
        isHost,
        participants: meeting.participants.map((p) => ({
          id: p.id,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          user: p.user,
        })),
      },
    });
  } catch (error) {
    console.error('[MeetingController.getMeetingById] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve meeting',
    });
  }
}

export async function getMeetingByCode(req: Request, res: Response): Promise<void> {
  try {
    const paramResult = roomCodeParamSchema.safeParse({ code: req.params.code });
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid room code format',
      });
      return;
    }

    const { code } = paramResult.data;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { roomCode: code },
      include: {
        host: { select: SAFE_HOST_SELECT },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No meeting found with this room code',
      });
      return;
    }

    res.status(200).json({
      meeting: {
        id: meeting.id,
        roomCode: meeting.roomCode,
        title: meeting.title,
        status: meeting.status,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
        host: meeting.host,
        isHost: meeting.hostId === userId,
        participantCount: meeting._count.participants,
      },
    });
  } catch (error) {
    console.error('[MeetingController.getMeetingByCode] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resolve room code',
    });
  }
}

export async function endMeeting(req: Request, res: Response): Promise<void> {
  try {
    const paramResult = meetingIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid meeting ID format',
      });
      return;
    }

    const { id } = paramResult.data;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { id: true, hostId: true, status: true },
    });

    if (!meeting) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Meeting not found',
      });
      return;
    }

    // Host-only authorization
    if (meeting.hostId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the meeting host can end the meeting',
      });
      return;
    }

    if (meeting.status === 'ENDED') {
      res.status(200).json({
        message: 'Meeting has already ended',
        meeting,
      });
      return;
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
      include: {
        host: { select: SAFE_HOST_SELECT },
      },
    });

    res.status(200).json({
      message: 'Meeting ended successfully',
      meeting: updated,
    });
  } catch (error) {
    console.error('[MeetingController.endMeeting] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to end meeting',
    });
  }
}

export async function getMeetingSummary(req: Request, res: Response): Promise<void> {
  try {
    const paramResult = meetingIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid meeting ID format',
      });
      return;
    }

    const { id } = paramResult.data;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        host: { select: SAFE_HOST_SELECT },
        participants: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Meeting not found',
      });
      return;
    }

    // Access authorization check
    const isHost = meeting.hostId === userId;
    const isParticipant = meeting.participants.some((p) => p.userId === userId);

    if (!isHost && !isParticipant) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this meeting summary',
      });
      return;
    }

    const createdAt = new Date(meeting.createdAt);
    const endedAt = meeting.endedAt ? new Date(meeting.endedAt) : null;
    const durationSeconds = endedAt
      ? Math.max(0, Math.round((endedAt.getTime() - createdAt.getTime()) / 1000))
      : Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 1000));

    res.status(200).json({
      summary: {
        id: meeting.id,
        title: meeting.title,
        roomCode: meeting.roomCode,
        status: meeting.status,
        host: meeting.host,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
        durationSeconds,
        participantCount: meeting.participants.length,
        participants: meeting.participants.map((p) => ({
          id: p.id,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          user: p.user,
        })),
      },
    });
  } catch (error) {
    console.error('[MeetingController.getMeetingSummary] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve meeting summary',
    });
  }
}