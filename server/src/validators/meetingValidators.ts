import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Meeting title is required' })
    .max(100, { message: 'Meeting title cannot exceed 100 characters' }),
});

export const roomCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(5, { message: 'Room code is too short' })
    .max(30, { message: 'Room code is too long' }),
});

export const meetingIdParamSchema = z.object({
  id: z
    .string()
    .uuid({ message: 'Invalid meeting ID format' }),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;