import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
export const matchesRouter = Router();
function generateMatchCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars[crypto.randomInt(0, chars.length)];
    }
    return result;
}
const createMatchSchema = z.object({
    totalRounds: z.number().int().min(1).max(100).default(15),
    isPrivate: z.boolean().default(false),
    timerEnabled: z.boolean().default(true),
    turnTimeLimit: z.number().int().min(10).max(600).default(60),
    totalTimeBank: z.number().int().min(30).max(3600).default(300),
    chatEnabled: z.boolean().default(true),
});
// GET /api/matches (List open public lobbies)
matchesRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const matches = await prisma.match.findMany({
            where: {
                status: 'WAITING',
                isPrivate: false,
            },
            include: {
                host: { select: { username: true } },
                participants: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const list = matches.map((m) => {
            const live = m.liveGameState;
            return {
                id: m.id,
                code: m.code,
                hostUsername: m.host.username,
                isPrivate: m.isPrivate,
                status: m.status,
                totalRounds: m.totalRounds,
                currentRound: m.currentRound,
                playerCount: m.participants.length,
                createdAt: m.createdAt.toISOString(),
                timerConfig: live?.timer?.config || live?.timerConfig,
            };
        });
        res.json(list);
    }
    catch (err) {
        console.error('List matches error:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Spiele.' });
    }
});
// GET /api/matches/current (Find active match for user - essential for reconnect)
matchesRouter.get('/current', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Nicht authentifiziert.' });
            return;
        }
        const participation = await prisma.matchParticipant.findFirst({
            where: {
                userId: req.user.userId,
                match: {
                    status: { in: ['WAITING', 'IN_PROGRESS'] },
                },
            },
            include: {
                match: true,
            },
            orderBy: { match: { createdAt: 'desc' } },
        });
        if (!participation) {
            res.json({ currentMatch: null });
            return;
        }
        res.json({
            currentMatch: {
                id: participation.match.id,
                code: participation.match.code,
                status: participation.match.status,
                currentRound: participation.match.currentRound,
                totalRounds: participation.match.totalRounds,
            },
        });
    }
    catch (err) {
        console.error('Check current match error:', err);
        res.status(500).json({ error: 'Fehler beim Prüfen des laufenden Spiels.' });
    }
});
// POST /api/matches (Create match)
matchesRouter.post('/', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Nicht authentifiziert.' });
            return;
        }
        const parseResult = createMatchSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.errors[0]?.message });
            return;
        }
        const { totalRounds, isPrivate, timerEnabled, turnTimeLimit, totalTimeBank, chatEnabled } = parseResult.data;
        const timerConfig = {
            enabled: timerEnabled,
            turnTimeLimit,
            totalTimeBank,
        };
        let code = generateMatchCode();
        // Ensure code uniqueness
        while (await prisma.match.findUnique({ where: { code } })) {
            code = generateMatchCode();
        }
        const match = await prisma.match.create({
            data: {
                code,
                hostId: req.user.userId,
                totalRounds,
                isPrivate,
                status: 'WAITING',
                currentRound: 1,
                liveGameState: {
                    timerConfig,
                    chatEnabled,
                },
                participants: {
                    create: {
                        userId: req.user.userId,
                        seatIndex: 0,
                        isBot: false,
                    },
                },
            },
            include: {
                participants: {
                    include: { user: { select: { username: true } } },
                },
            },
        });
        res.status(201).json(match);
    }
    catch (err) {
        console.error('Create match error:', err);
        res.status(500).json({ error: 'Fehler beim Erstellen des Spiels.' });
    }
});
// GET /api/matches/:id (Get match details)
matchesRouter.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rawId = req.params.id;
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) {
            res.status(400).json({ error: 'ID erforderlich.' });
            return;
        }
        const match = await prisma.match.findFirst({
            where: {
                OR: [{ id }, { code: id.toUpperCase() }],
            },
            include: {
                host: { select: { id: true, username: true } },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, eloRating: true, lifetimeScore: true },
                        },
                    },
                    orderBy: { seatIndex: 'asc' },
                },
            },
        });
        if (!match) {
            res.status(404).json({ error: 'Spiel nicht gefunden.' });
            return;
        }
        res.json(match);
    }
    catch (err) {
        console.error('Get match error:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen des Spiels.' });
    }
});
// POST /api/matches/join-by-code
matchesRouter.post('/join-by-code', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Nicht authentifiziert.' });
            return;
        }
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Gültiger Raum-Code erforderlich.' });
            return;
        }
        const match = await prisma.match.findUnique({
            where: { code: code.trim().toUpperCase() },
            include: {
                participants: true,
            },
        });
        if (!match) {
            res.status(404).json({ error: 'Kein Raum mit diesem Code gefunden.' });
            return;
        }
        // Check if user is already a participant
        const existing = match.participants.find((p) => p.userId === req.user.userId);
        if (existing) {
            res.json({ matchId: match.id, seatIndex: existing.seatIndex });
            return;
        }
        if (match.status !== 'WAITING') {
            res.status(400).json({ error: 'Dieses Spiel läuft bereits oder ist beendet.' });
            return;
        }
        if (match.participants.length >= 3) {
            res.status(400).json({ error: 'Dieser Raum ist bereits voll (3/3 Spieler).' });
            return;
        }
        // Find first free seat (0, 1, or 2)
        const takenSeats = match.participants.map((p) => p.seatIndex);
        const freeSeat = [0, 1, 2].find((s) => !takenSeats.includes(s));
        if (freeSeat === undefined) {
            res.status(400).json({ error: 'Kein freier Platz verfügbar.' });
            return;
        }
        await prisma.matchParticipant.create({
            data: {
                matchId: match.id,
                userId: req.user.userId,
                seatIndex: freeSeat,
            },
        });
        res.json({ matchId: match.id, seatIndex: freeSeat });
    }
    catch (err) {
        console.error('Join match error:', err);
        res.status(500).json({ error: 'Fehler beim Beitreten des Spiels.' });
    }
});
//# sourceMappingURL=matches.js.map