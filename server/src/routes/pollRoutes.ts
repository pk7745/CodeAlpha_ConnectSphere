import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/authMiddleware';
import { getSocketServer } from '../socket';

const router = Router();
router.use(requireAuth);

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

// 1. Get Polls for Meeting
router.get('/:meetingId/polls', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const polls = await prisma.poll.findMany({
      where: { meetingId },
      include: {
        creator: { select: { id: true, name: true } },
        votes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = polls.map((p) => {
      let optionsList: string[] = [];
      try {
        optionsList = JSON.parse(p.options);
      } catch {
        optionsList = [];
      }

      // Calculate vote counts per option
      const voteCounts = optionsList.map(
        (_, idx) => p.votes.filter((v) => v.optionIdx === idx).length
      );

      const userVote = p.votes.find((v) => v.userId === user.id);

      return {
        id: p.id,
        meetingId: p.meetingId,
        question: p.question,
        options: optionsList,
        status: p.status,
        creator: p.creator,
        createdAt: p.createdAt.toISOString(),
        totalVotes: p.votes.length,
        voteCounts,
        userVotedOption: userVote ? userVote.optionIdx : null,
      };
    });

    return res.json({ success: true, polls: formatted });
  } catch (error) {
    console.error('[Get polls] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve polls' });
  }
});

// 2. Create Poll
router.post('/:meetingId/polls', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;
    const { question, options } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Poll question is required' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'At least 2 options are required' });
    }

    const cleanOptions = options
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);

    if (cleanOptions.length < 2) {
      return res.status(400).json({ error: 'At least 2 non-empty options are required' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const poll = await prisma.poll.create({
      data: {
        meetingId,
        creatorId: user.id,
        question: question.trim(),
        options: JSON.stringify(cleanOptions),
        status: 'OPEN',
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    const payload = {
      id: poll.id,
      meetingId: poll.meetingId,
      question: poll.question,
      options: cleanOptions,
      status: poll.status,
      creator: poll.creator,
      createdAt: poll.createdAt.toISOString(),
      totalVotes: 0,
      voteCounts: cleanOptions.map(() => 0),
      userVotedOption: null,
    };

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('poll:created', { poll: payload });
    }

    return res.status(201).json({ success: true, poll: payload });
  } catch (error) {
    console.error('[Create poll] Error:', error);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
});

// 3. Vote in Poll
router.post('/:meetingId/polls/:pollId/vote', async (req: Request, res: Response) => {
  try {
    const { meetingId, pollId } = req.params;
    const user = (req as any).user;
    const { optionIdx } = req.body;

    if (typeof optionIdx !== 'number' || optionIdx < 0) {
      return res.status(400).json({ error: 'Valid optionIdx is required' });
    }

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { votes: true },
    });

    if (!poll || poll.meetingId !== meetingId) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.status !== 'OPEN') {
      return res.status(400).json({ error: 'This poll is already closed' });
    }

    let optionsList: string[] = [];
    try {
      optionsList = JSON.parse(poll.options);
    } catch {
      optionsList = [];
    }

    if (optionIdx >= optionsList.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    // Upsert vote for this user in this poll
    await prisma.pollVote.upsert({
      where: {
        pollId_userId: { pollId, userId: user.id },
      },
      update: { optionIdx },
      create: { pollId, userId: user.id, optionIdx },
    });

    // Re-tally votes
    const allVotes = await prisma.pollVote.findMany({ where: { pollId } });
    const voteCounts = optionsList.map(
      (_, idx) => allVotes.filter((v) => v.optionIdx === idx).length
    );

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('poll:voted', {
        pollId,
        optionIdx,
        userId: user.id,
        voteCounts,
      });
    }

    return res.json({
      success: true,
      pollId,
      userVotedOption: optionIdx,
      voteCounts,
      totalVotes: allVotes.length,
    });
  } catch (error) {
    console.error('[Vote poll] Error:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

// 4. Close Poll
router.post('/:meetingId/polls/:pollId/close', async (req: Request, res: Response) => {
  try {
    const { meetingId, pollId } = req.params;
    const user = (req as any).user;

    const { meeting, isMember } = await checkMembership(meetingId, user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!isMember) return res.status(403).json({ error: 'Access forbidden' });

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll || poll.meetingId !== meetingId) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const canClose = poll.creatorId === user.id || meeting.hostId === user.id;
    if (!canClose) {
      return res.status(403).json({ error: 'Only the poll creator or meeting host can close this poll' });
    }

    await prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED' },
    });

    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('poll:closed', { pollId });
    }

    return res.json({ success: true, message: 'Poll closed successfully' });
  } catch (error) {
    console.error('[Close poll] Error:', error);
    return res.status(500).json({ error: 'Failed to close poll' });
  }
});

export default router;
