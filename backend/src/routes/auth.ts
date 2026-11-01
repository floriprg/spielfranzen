import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein.')
    .max(20, 'Benutzername darf maximal 20 Zeichen lang sein.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nur Buchstaben, Zahlen, Bindestriche und Unterstriche erlaubt.'),
  email: z.string().email('Ungültige E-Mail-Adresse.'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein.'),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Benutzername oder E-Mail erforderlich.'),
  password: z.string().min(1, 'Passwort erforderlich.'),
});

// POST /api/auth/register
authRouter.post('/register', async (req, res): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message });
      return;
    }

    const { username, email, password } = parseResult.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: { equals: username, mode: 'insensitive' } }, { email: { equals: email, mode: 'insensitive' } }],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
        return;
      }
      res.status(409).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lifetimeScore: user.lifetimeScore,
        eloRating: user.eloRating,
        matchesPlayed: user.matchesPlayed,
        matchesWon: user.matchesWon,
        soloGamesPlayed: user.soloGamesPlayed,
        soloGamesWon: user.soloGamesWon,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Interner Serverfehler bei der Registrierung.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message });
      return;
    }

    const { emailOrUsername, password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: emailOrUsername, mode: 'insensitive' } },
          { email: { equals: emailOrUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lifetimeScore: user.lifetimeScore,
        eloRating: user.eloRating,
        matchesPlayed: user.matchesPlayed,
        matchesWon: user.matchesWon,
        soloGamesPlayed: user.soloGamesPlayed,
        soloGamesWon: user.soloGamesWon,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Interner Serverfehler beim Login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht authentifiziert.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      lifetimeScore: user.lifetimeScore,
      eloRating: user.eloRating,
      matchesPlayed: user.matchesPlayed,
      matchesWon: user.matchesWon,
      soloGamesPlayed: user.soloGamesPlayed,
      soloGamesWon: user.soloGamesWon,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ error: 'Interner Serverfehler.' });
  }
});
