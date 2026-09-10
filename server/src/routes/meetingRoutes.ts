import { Router } from 'express';
import {
  createMeeting,
  getUserMeetings,
  getMeetingByCode,
  getMeetingById,
  endMeeting,
  getMeetingSummary,
} from '../controllers/meetingController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All meeting routes require authentication
router.use(requireAuth);

router.post('/', createMeeting);
router.get('/', getUserMeetings);
router.get('/code/:code', getMeetingByCode);
router.get('/:id', getMeetingById);
router.post('/:id/end', endMeeting);
router.get('/:id/summary', getMeetingSummary);

export default router;