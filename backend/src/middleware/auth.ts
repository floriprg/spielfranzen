import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export interface AuthUserPayload {
  userId: string;
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function generateToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access token required.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.slice(7)
      : null);

  if (!token) {
    return next(new Error('Authentication error: Token required.'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token.'));
  }
}
