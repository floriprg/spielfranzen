import { Router } from 'express';
import { prisma } from '../db/prisma.js';
export const leaderboardRouter = Router();
// GET /api/leaderboard
leaderboardRouter.get('/', async (req, res) => {
    try {
        const { sortBy = 'lifetimeScore' } = req.query;
        let orderBy = { lifetimeScore: 'desc' };
        if (sortBy === 'elo') {
            orderBy = { eloRating: 'desc' };
        }
        else if (sortBy === 'wins') {
            orderBy = { matchesWon: 'desc' };
        }
        const users = await prisma.user.findMany({
            orderBy,
            take: 50,
            select: {
                id: true,
                username: true,
                lifetimeScore: true,
                eloRating: true,
                matchesPlayed: true,
                matchesWon: true,
                soloGamesPlayed: true,
                soloGamesWon: true,
            },
        });
        const entries = users.map((u) => {
            const winRate = u.matchesPlayed > 0 ? Math.round((u.matchesWon / u.matchesPlayed) * 100) : 0;
            const soloWinRate = u.soloGamesPlayed > 0 ? Math.round((u.soloGamesWon / u.soloGamesPlayed) * 100) : 0;
            return {
                id: u.id,
                username: u.username,
                lifetimeScore: u.lifetimeScore,
                eloRating: u.eloRating,
                matchesPlayed: u.matchesPlayed,
                matchesWon: u.matchesWon,
                winRate,
                soloGamesPlayed: u.soloGamesPlayed,
                soloGamesWon: u.soloGamesWon,
                soloWinRate,
            };
        });
        res.json(entries);
    }
    catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Bestenliste.' });
    }
});
// GET /api/users/:username (User profile + recent matches)
leaderboardRouter.get('/users/:username', async (req, res) => {
    try {
        const rawUsername = req.params.username;
        const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
        if (!username) {
            res.status(400).json({ error: 'Benutzername erforderlich.' });
            return;
        }
        const user = await prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
            select: {
                id: true,
                username: true,
                lifetimeScore: true,
                eloRating: true,
                matchesPlayed: true,
                matchesWon: true,
                soloGamesPlayed: true,
                soloGamesWon: true,
                createdAt: true,
                participations: {
                    take: 10,
                    orderBy: { match: { createdAt: 'desc' } },
                    include: {
                        match: {
                            select: {
                                id: true,
                                code: true,
                                status: true,
                                totalRounds: true,
                                currentRound: true,
                                createdAt: true,
                                completedAt: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            res.status(404).json({ error: 'Benutzer nicht gefunden.' });
            return;
        }
        res.json(user);
    }
    catch (err) {
        console.error('User profile error:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen des Benutzerprofils.' });
    }
});
//# sourceMappingURL=leaderboard.js.map