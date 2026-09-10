import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/authMiddleware';
import { getSocketServer } from '../socket';

const router = Router();

// All collaboration routes require authentication
router.use(requireAuth);

// Helper to check meeting membership
async function checkMembership(meetingId: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });

  if (!meeting) return { meeting: null, isMember: false };

  const isMember =
    meeting.hostId === userId ||
    meeting.participants.some((p) => p.userId === userId);

  return { meeting, isMember };
}

// ==========================================
// 1. NOTES
// ==========================================
router.get('/:meetingId/notes', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    let note = await prisma.meetingNote.findUnique({
      where: { meetingId },
    });

    if (!note) {
      note = await prisma.meetingNote.create({
        data: { meetingId, content: '' },
      });
    }

    return res.json({ success: true, note });
  } catch (error) {
    console.error('[Get notes] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

router.put('/:meetingId/notes', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Note content must be a string' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const note = await prisma.meetingNote.upsert({
      where: { meetingId },
      update: { content },
      create: { meetingId, content },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('note:updated', {
        content,
        updatedBy: user.name,
      });
    }

    return res.json({ success: true, note });
  } catch (error) {
    console.error('[Save notes] Error:', error);
    return res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ==========================================
// 2. AGENDA
// ==========================================
router.get('/:meetingId/agenda', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const items = await prisma.agendaItem.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    return res.json({ success: true, items });
  } catch (error) {
    console.error('[Get agenda] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve agenda items' });
  }
});

router.post('/:meetingId/agenda', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Agenda title is required' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const count = await prisma.agendaItem.count({ where: { meetingId } });

    const item = await prisma.agendaItem.create({
      data: {
        meetingId,
        title: title.trim(),
        order: count,
      },
    });

    const allItems = await prisma.agendaItem.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('agenda:updated', { items: allItems });
    }

    return res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('[Add agenda] Error:', error);
    return res.status(500).json({ error: 'Failed to create agenda item' });
  }
});

router.patch('/:meetingId/agenda/:itemId', async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const user = (req as any).user;
    const isCompleted = typeof req.body.isCompleted === 'boolean' ? req.body.isCompleted : (typeof req.body.completed === 'boolean' ? req.body.completed : undefined);
    const { title } = req.body;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const item = await prisma.agendaItem.update({
      where: { id: itemId },
      data: {
        title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
        isCompleted: typeof isCompleted === 'boolean' ? isCompleted : undefined,
        completedBy: isCompleted ? user.name : null,
      },
    });

    const allItems = await prisma.agendaItem.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('agenda:updated', { items: allItems });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error('[Update agenda] Error:', error);
    return res.status(500).json({ error: 'Failed to update agenda item' });
  }
});

router.delete('/:meetingId/agenda/:itemId', async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    await prisma.agendaItem.delete({
      where: { id: itemId },
    });

    const allItems = await prisma.agendaItem.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('agenda:updated', { items: allItems });
    }

    return res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('[Delete agenda] Error:', error);
    return res.status(500).json({ error: 'Failed to delete agenda item' });
  }
});

// ==========================================
// 3. ACTION ITEMS
// ==========================================
router.get('/:meetingId/actions', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const items = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, items });
  } catch (error) {
    console.error('[Get action items] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve action items' });
  }
});

router.post('/:meetingId/actions', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { task, assigneeName } = req.body;

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return res.status(400).json({ error: 'Task description is required' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const item = await prisma.actionItem.create({
      data: {
        meetingId,
        task: task.trim(),
        assigneeName: typeof assigneeName === 'string' && assigneeName.trim() ? assigneeName.trim() : 'Unassigned',
        status: 'TODO',
      },
    });

    const allItems = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('action:updated', { items: allItems });
    }

    return res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('[Add action item] Error:', error);
    return res.status(500).json({ error: 'Failed to create action item' });
  }
});

router.patch('/:meetingId/actions/:itemId', async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const user = (req as any).user;
    const { status, assigneeName } = req.body;

    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid action item status' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const item = await prisma.actionItem.update({
      where: { id: itemId },
      data: {
        status: status || undefined,
        assigneeName: typeof assigneeName === 'string' ? assigneeName.trim() : undefined,
      },
    });

    const allItems = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('action:updated', { items: allItems });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error('[Update action item] Error:', error);
    return res.status(500).json({ error: 'Failed to update action item' });
  }
});

router.delete('/:meetingId/actions/:itemId', async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    await prisma.actionItem.delete({
      where: { id: itemId },
    });

    const allItems = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('action:updated', { items: allItems });
    }

    return res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('[Delete action item] Error:', error);
    return res.status(500).json({ error: 'Failed to delete action item' });
  }
});

// ==========================================
// 4. WHITEBOARD
// ==========================================
router.get('/:meetingId/whiteboard', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    let wb = await prisma.whiteboardState.findUnique({
      where: { meetingId },
    });

    if (!wb) {
      wb = await prisma.whiteboardState.create({
        data: { meetingId, strokesJson: '[]' },
      });
    }

    return res.json({ success: true, whiteboard: wb });
  } catch (error) {
    console.error('[Get whiteboard] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve whiteboard state' });
  }
});

router.put('/:meetingId/whiteboard', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { strokesJson, data } = req.body;
    const strokes = typeof strokesJson === 'string' ? strokesJson : (typeof data === 'string' ? data : null);

    if (!strokes) {
      return res.status(400).json({ error: 'strokesJson must be a string' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const whiteboard = await prisma.whiteboardState.upsert({
      where: { meetingId },
      update: { strokesJson: strokes },
      create: { meetingId, strokesJson: strokes },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('whiteboard:sync', {
        strokesJson: strokes,
        senderUserId: user.id,
      });
    }

    return res.json({ success: true, whiteboard });
  } catch (error) {
    console.error('[Save whiteboard] Error:', error);
    return res.status(500).json({ error: 'Failed to save whiteboard' });
  }
});

// ==========================================
// 5. CHAT HISTORY
// ==========================================
router.get('/:meetingId/chat', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const messages = await prisma.chatMessage.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return res.json({ success: true, messages });
  } catch (error) {
    console.error('[Get chat] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve chat messages' });
  }
});

export default router;
