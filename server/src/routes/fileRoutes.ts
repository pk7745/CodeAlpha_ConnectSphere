import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/authMiddleware';
import { getSocketServer } from '../socket';
import { storageProvider } from '../services/storage';
import { fileUploadRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

// Blocked executable extensions
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs',
  '.js', '.mjs', '.jar', '.bin', '.msi', '.dll',
  '.com', '.scr', '.pif', '.hta', '.cpl'
];

// Configure Multer storage using StorageProvider abstraction
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageProvider.getStorageDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBasename = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 50);
    const uniqueName = `${crypto.randomUUID()}-${safeBasename}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Executable and potentially unsafe files are not permitted'));
    }
    cb(null, true);
  },
});

// All file routes require authentication
router.use(requireAuth);

// 1. Upload File to Meeting
router.post(
  '/:meetingId/files',
  fileUploadRateLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum limit of 15MB' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const { meetingId } = req.params;
      const user = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Check meeting existence
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true },
      });

      if (!meeting) {
        // Clean up uploaded file if meeting not found
        storageProvider.deleteFile(file.filename);
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify participant authorization
      const isParticipant =
        meeting.hostId === user.id ||
        meeting.participants.some((p) => p.userId === user.id);

      if (!isParticipant) {
        storageProvider.deleteFile(file.filename);
        return res.status(403).json({ error: 'You must be a participant to share files in this meeting' });
      }

      // Persist file metadata
      const sharedFile = await prisma.sharedFile.create({
        data: {
          meetingId,
          uploaderId: user.id,
          filename: file.filename,
          originalName: file.originalname,
          fileType: file.mimetype || 'application/octet-stream',
          fileSize: file.size,
          storagePath: file.filename, // Store only the relative filename
        },
        include: {
          uploader: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      // Notify room via Socket.IO
      const io = getSocketServer();
      if (io) {
        io.to(meeting.roomCode).emit('file:shared', sharedFile);
      }

      return res.status(201).json({ success: true, file: sharedFile });
    } catch (error) {
      console.error('[File upload] Error:', error);
      return res.status(500).json({ error: 'Failed to process file upload' });
    }
  }
);

// 2. List Files for Meeting
router.get('/:meetingId/files', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const user = (req as any).user;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant =
      meeting.hostId === user.id ||
      meeting.participants.some((p) => p.userId === user.id);

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const files = await prisma.sharedFile.findMany({
      where: { meetingId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, files });
  } catch (error) {
    console.error('[File list] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve shared files' });
  }
});

// 3. Download Shared File
router.get(['/:meetingId/files/:fileId', '/:meetingId/files/:fileId/download'], async (req: Request, res: Response) => {
  try {
    const { meetingId, fileId } = req.params;
    const user = (req as any).user;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant =
      meeting.hostId === user.id ||
      meeting.participants.some((p) => p.userId === user.id);

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const file = await prisma.sharedFile.findFirst({
      where: { id: fileId, meetingId },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Path traversal prevention: resolve strictly via storageProvider
    const resolvedPath = storageProvider.resolvePath(file.storagePath);

    if (!resolvedPath) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    return res.download(resolvedPath, file.originalName);
  } catch (error) {
    console.error('[File download] Error:', error);
    return res.status(500).json({ error: 'Failed to download file' });
  }
});

// 4. Delete Shared File (Uploader or Meeting Host only)
router.delete('/:meetingId/files/:fileId', async (req: Request, res: Response) => {
  try {
    const { meetingId, fileId } = req.params;
    const user = (req as any).user;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const file = await prisma.sharedFile.findFirst({
      where: { id: fileId, meetingId },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Authorization: uploader or host
    const isAuthorized = file.uploaderId === user.id || meeting.hostId === user.id;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only the uploader or meeting host can delete this file' });
    }

    // Delete disk file via storageProvider
    await storageProvider.deleteFile(file.storagePath);

    // Delete DB record
    await prisma.sharedFile.delete({
      where: { id: fileId },
    });

    // Notify room via Socket.IO
    const io = getSocketServer();
    if (io) {
      io.to(meeting.roomCode).emit('file:deleted', { fileId });
    }

    return res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('[File delete] Error:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
