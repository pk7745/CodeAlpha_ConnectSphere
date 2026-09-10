import { PrismaClient } from '@prisma/client';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 30 chars, ambiguous 0/O/1/I omitted
const CODE_LENGTH = 6;

export function generateRandomCodeSegment(): string {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[randomIndex];
  }
  return result;
}

export async function generateUniqueRoomCode(
  prisma: PrismaClient,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `CONNECT-${generateRandomCodeSegment()}`;
    const existing = await prisma.meeting.findUnique({
      where: { roomCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  // Fallback with timestamp suffix to mathematically guarantee uniqueness
  const timestampSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `CONNECT-${generateRandomCodeSegment().slice(0, 2)}${timestampSuffix}`;
}