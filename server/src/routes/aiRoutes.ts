import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/authMiddleware';
import { AiMeetingService } from '../services/aiService';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();
router.use(requireAuth);
router.use(aiRateLimiter);

// Helper to check membership
async function checkMembership(meetingId: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      host: { select: { id: true, name: true, email: true } },
      participants: { select: { userId: true, role: true } },
      notes: true,
      agendaItems: { orderBy: { order: 'asc' } },
      actionItems: { orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!meeting) return { meeting: null, isMember: false };

  const isMember =
    meeting.hostId === userId ||
    meeting.participants.some((p) => p.userId === userId);

  return { meeting, isMember };
}

// 1. Generate / Retrieve AI Meeting Summary
router.get('/:meetingId/ai/summary', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const summary = await AiMeetingService.generateSummary({
      title: meeting.title,
      notes: meeting.notes?.content,
      agendaItems: meeting.agendaItems.map((a) => ({ title: a.title, isCompleted: a.isCompleted })),
      actionItems: meeting.actionItems.map((a) => ({ task: a.task, assigneeName: a.assigneeName, status: a.status })),
      chatMessages: meeting.messages.map((m) => ({ senderName: m.senderName, content: m.content, createdAt: m.createdAt.toISOString() })),
      participantCount: meeting.participants.length || 1,
    });

    return res.json({ success: true, summary });
  } catch (error) {
    console.error('[AI summary] Error:', error);
    return res.status(500).json({ error: 'Failed to generate AI summary' });
  }
});

// 2. Extract Action Items via AI (with optional insertion)
router.post('/:meetingId/ai/extract-actions', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { autoCreate } = req.body;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const summary = await AiMeetingService.generateSummary({
      title: meeting.title,
      notes: meeting.notes?.content,
      agendaItems: meeting.agendaItems.map((a) => ({ title: a.title, isCompleted: a.isCompleted })),
      actionItems: meeting.actionItems.map((a) => ({ task: a.task, assigneeName: a.assigneeName, status: a.status })),
      chatMessages: meeting.messages.map((m) => ({ senderName: m.senderName, content: m.content, createdAt: m.createdAt.toISOString() })),
      participantCount: meeting.participants.length || 1,
    });

    const extracted = summary.suggestedActionItems;

    // If autoCreate is true, persist new action items in the database
    if (autoCreate && extracted.length > 0) {
      for (const item of extracted) {
        const existing = await prisma.actionItem.findFirst({
          where: { meetingId, task: item.task },
        });
        if (!existing) {
          await prisma.actionItem.create({
            data: {
              meetingId,
              task: item.task,
              assigneeName: item.suggestedAssignee || 'Unassigned',
              status: 'TODO',
            },
          });
        }
      }
    }

    return res.json({ success: true, extractedActionItems: extracted });
  } catch (error) {
    console.error('[AI extract-actions] Error:', error);
    return res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// 3. Ask Meeting Assistant (Contextual Q&A)
router.post('/:meetingId/ai/ask', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const answer = await AiMeetingService.answerQuestion(
      {
        title: meeting.title,
        notes: meeting.notes?.content,
        agendaItems: meeting.agendaItems.map((a) => ({ title: a.title, isCompleted: a.isCompleted })),
        actionItems: meeting.actionItems.map((a) => ({ task: a.task, assigneeName: a.assigneeName, status: a.status })),
        chatMessages: meeting.messages.map((m) => ({ senderName: m.senderName, content: m.content, createdAt: m.createdAt.toISOString() })),
        participantCount: meeting.participants.length || 1,
      },
      question.trim()
    );

    return res.json({ success: true, question: question.trim(), answer });
  } catch (error) {
    console.error('[AI ask] Error:', error);
    return res.status(500).json({ error: 'Failed to process assistant query' });
  }
});

export default router;
