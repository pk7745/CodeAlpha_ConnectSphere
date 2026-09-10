import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const records = new Map<string, ClientRecord>();

  // Periodically clean up expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetTime) {
        records.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent interval from holding the event loop open on process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, skip rate limiting to avoid test interference
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
    const key = `${clientIp}_${req.baseUrl || ''}`;
    const now = Date.now();

    let record = records.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      records.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > options.max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: retryAfterSec,
      });
      return;
    }

    next();
  };
}

// 30 auth attempts per 15 minutes per IP
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

// 60 AI requests per minute
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'AI request limit reached. Please wait a minute before requesting again.',
});

// 30 file uploads per 10 minutes
export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Upload frequency exceeded. Please wait a few minutes before uploading more files.',
});
