import bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

export const authRouter = Router();

const googleClient = new OAuth2Client(config.googleClientId || undefined);

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
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
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
        avatarUrl: user.avatarUrl,
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
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
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

    if (!user.passwordHash) {
      res.status(400).json({
        error: 'Dieses Konto ist mit Google verknüpft. Bitte melde dich über "Mit Google anmelden" an.',
      });
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
        avatarUrl: user.avatarUrl,
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

// POST /api/auth/google
authRouter.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, mockGoogleUser } = req.body;

    let googleId: string;
    let email: string;
    let name: string;
    let picture: string | undefined;

    if (credential) {
      // 1. Try google-auth-library verifyIdToken
      let payload: any = null;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId ? config.googleClientId : undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        // 2. Fallback to Google TokenInfo endpoint
        try {
          const resp = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
          );
          if (resp.ok) {
            payload = await resp.json();
          }
        } catch {
          // Tokeninfo also failed
        }
      }

      if (!payload || !payload.email || (!payload.sub && !payload.user_id)) {
        res.status(401).json({ error: 'Ungültiges oder abgelaufenes Google-Token.' });
        return;
      }

      googleId = payload.sub || payload.user_id;
      email = payload.email.toLowerCase();
      name = payload.name || payload.given_name || email.split('@')[0];
      picture = payload.picture;
    } else if (mockGoogleUser && process.env.NODE_ENV !== 'production') {
      // Dev mode simulated Google login
      googleId = mockGoogleUser.googleId || `google_${Date.now()}`;
      email = (mockGoogleUser.email || `user_${Date.now()}@gmail.com`).toLowerCase();
      name = mockGoogleUser.name || 'Google Spieler';
      picture = mockGoogleUser.picture;
    } else {
      res.status(400).json({ error: 'Google-Token erforderlich.' });
      return;
    }

    // Check if user with googleId already exists
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // Check if user with same email exists -> link googleId
      user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || picture,
          },
        });
      } else {
        // Create new user with unique username derived from name
        let cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 15);
        if (!cleanName || cleanName.length < 3) {
          cleanName = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 15);
        }
        if (cleanName.length < 3) {
          cleanName = `Spieler_${Math.floor(100 + Math.random() * 900)}`;
        }

        let username = cleanName;
        let counter = 1;
        while (
          await prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
          })
        ) {
          username = `${cleanName.slice(0, 13)}_${counter}`;
          counter++;
        }

        user = await prisma.user.create({
          data: {
            username,
            email,
            googleId,
            avatarUrl: picture,
          },
        });
      }
    } else if (picture && !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: picture },
      });
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
        avatarUrl: user.avatarUrl,
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
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Interner Serverfehler beim Google-Login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
      avatarUrl: user.avatarUrl,
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
