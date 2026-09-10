import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { sanitizeUser } from '../utils/sanitize';
import { registerSchema, loginSchema } from '../validators/authValidators';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password } = parseResult.data;

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists',
      });
      return;
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const safeUser = sanitizeUser(user);
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Registration successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('[AuthController.register] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user account',
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const safeUser = sanitizeUser(user);
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(200).json({
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('[AuthController.login] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process login request',
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated',
      });
      return;
    }

    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error('[AuthController.getMe] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile',
    });
  }
}