import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { BotEngine } from '../game/BotEngine.js';
import { GameEngine } from '../game/GameEngine.js';
import { sanitizeGameStateForPlayer } from '../game/sanitizer.js';
export class GameSocketHandler {
    io;
    activeMatches = new Map();
    // Map of userId -> Set of socket IDs
    userSockets = new Map();
    // Map of matchId -> active Bot timeout timer
    botTimers = new Map();
    // Map of matchId -> active trick review timer (3 seconds pause to view 3rd card and winner)
    trickTimers = new Map();
    // Map of matchId -> active player turn timeout timer
    turnTimers = new Map();
    constructor(io) {
        this.io = io;
    }
    register() {
        this.io.on('connection', async (socket) => {
            const user = socket.data.user;
            if (!user) {
                socket.disconnect();
                return;
            }
            const userId = user.userId;
            // Track user socket
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            // Handle match joining
            socket.on('game:join_match', async ({ matchId }) => {
                try {
                    await this.handlePlayerJoin(socket, matchId, userId);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Fehler beim Beitreten des Spiels.' });
                }
            });
            // Handle bidding
            socket.on('game:bid', async ({ matchId, action, bidValue }) => {
                try {
                    await this.handlePlayerBid(socket, matchId, userId, action, bidValue);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Ungültiges Gebot.' });
                }
            });
            // Handle talon action
            socket.on('game:talon_action', async ({ matchId, action, discardedCardIds, selectedMode }) => {
                try {
                    await this.handlePlayerTalonAction(socket, matchId, userId, action, discardedCardIds, selectedMode);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Ungültige Talon-Aktion.' });
                }
            });
            // Handle card play
            socket.on('game:play_card', async ({ matchId, cardId }) => {
                try {
                    await this.handlePlayerPlayCard(socket, matchId, userId, cardId);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Ungültige Karte.' });
                }
            });
            // Handle next round advance
            socket.on('game:next_round', async ({ matchId }) => {
                try {
                    await this.handleNextRound(socket, matchId, userId);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Fehler beim Rundenwechsel.' });
                }
            });
            // Handle adding a Bot
            socket.on('game:add_bot', async ({ matchId, seatIndex }) => {
                try {
                    await this.handleAddBot(socket, matchId, userId, seatIndex);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Fehler beim Hinzufügen des Bots.' });
                }
            });
            // Handle removing a Bot
            socket.on('game:remove_bot', async ({ matchId, seatIndex }) => {
                try {
                    await this.handleRemoveBot(socket, matchId, userId, seatIndex);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Fehler beim Entfernen des Bots.' });
                }
            });
            // Handle sending in-game chat message
            socket.on('chat:send_message', async ({ matchId, text }) => {
                try {
                    await this.handleSendChatMessage(socket, matchId, userId, text);
                }
                catch (err) {
                    socket.emit('game:error', { message: err.message || 'Fehler beim Senden der Chat-Nachricht.' });
                }
            });
            // Handle disconnect
            socket.on('disconnect', async () => {
                const sockets = this.userSockets.get(userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        this.userSockets.delete(userId);
                        // Mark user offline in active matches
                        for (const [matchId, state] of this.activeMatches.entries()) {
                            if (state && Array.isArray(state.players)) {
                                const seatIdx = state.players.findIndex((p) => p && p.userId === userId);
                                if (seatIdx !== -1 && state.players[seatIdx]) {
                                    state.players[seatIdx].isOnline = false;
                                    this.syncStateToMatch(matchId, state);
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    /**
     * Loads match from DB or memory.
     */
    async getOrLoadMatchState(matchId) {
        if (this.activeMatches.has(matchId)) {
            return this.activeMatches.get(matchId);
        }
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                participants: {
                    include: { user: true },
                    orderBy: { seatIndex: 'asc' },
                },
            },
        });
        if (!match)
            return null;
        if (match.liveGameState) {
            const parsed = match.liveGameState;
            if (parsed &&
                Array.isArray(parsed.players) &&
                parsed.players.length === 3 &&
                parsed.phase &&
                Array.isArray(parsed.hands)) {
                const state = parsed;
                if (match.isPrivate !== undefined) {
                    state.isPrivate = match.isPrivate;
                }
                if (state.chatEnabled === undefined) {
                    state.chatEnabled = match.liveGameState?.chatEnabled ?? true;
                }
                if (!state.chatMessages) {
                    state.chatMessages = match.liveGameState?.chatMessages || [];
                }
                if (state.phase === 'ROUND_SUMMARY' || state.phase === 'MATCH_COMPLETED') {
                    // If the match was in summary, the trick must be cleared so clients can view summary
                    state.currentTrick = [];
                }
                if (!state.timer) {
                    state.timer = {
                        config: { enabled: true, turnTimeLimit: 60, totalTimeBank: 300 },
                        turnStartedAt: null,
                        turnDuration: 60,
                        playerBanks: [300, 300, 300],
                    };
                }
                this.activeMatches.set(matchId, state);
                return state;
            }
        }
        return null;
    }
    /**
     * Persists match state to PostgreSQL.
     */
    async persistMatchState(state) {
        try {
            const matchExists = await prisma.match.findUnique({
                where: { id: state.matchId },
                select: { id: true },
            });
            if (!matchExists) {
                // Match was deleted or does not exist in DB
                this.activeMatches.delete(state.matchId);
                if (this.botTimers.has(state.matchId)) {
                    clearTimeout(this.botTimers.get(state.matchId));
                    this.botTimers.delete(state.matchId);
                }
                if (this.trickTimers.has(state.matchId)) {
                    clearTimeout(this.trickTimers.get(state.matchId));
                    this.trickTimers.delete(state.matchId);
                }
                if (this.turnTimers.has(state.matchId)) {
                    clearTimeout(this.turnTimers.get(state.matchId));
                    this.turnTimers.delete(state.matchId);
                }
                return;
            }
            await prisma.match.update({
                where: { id: state.matchId },
                data: {
                    status: state.status,
                    currentRound: state.currentRound,
                    liveGameState: state,
                    completedAt: state.status === 'COMPLETED' ? new Date() : undefined,
                },
            });
            // Also update participant scores in DB
            for (const p of state.players) {
                if (!p.isBot) {
                    await prisma.matchParticipant.updateMany({
                        where: { matchId: state.matchId, userId: p.userId },
                        data: { currentMatchScore: p.score },
                    });
                }
            }
        }
        catch (err) {
            if (err?.code === 'P2025') {
                // Record was removed from DB
                this.activeMatches.delete(state.matchId);
                if (this.botTimers.has(state.matchId)) {
                    clearTimeout(this.botTimers.get(state.matchId));
                    this.botTimers.delete(state.matchId);
                }
                if (this.trickTimers.has(state.matchId)) {
                    clearTimeout(this.trickTimers.get(state.matchId));
                    this.trickTimers.delete(state.matchId);
                }
                if (this.turnTimers.has(state.matchId)) {
                    clearTimeout(this.turnTimers.get(state.matchId));
                    this.turnTimers.delete(state.matchId);
                }
                return;
            }
            console.error('Error persisting match state:', err);
        }
    }
    /**
     * Broadcasts sanitized state to each player in the match.
     */
    syncStateToMatch(matchId, state) {
        const room = `match:${matchId}`;
        const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
        if (!socketsInRoom)
            return;
        for (const socketId of socketsInRoom) {
            const clientSocket = this.io.sockets.sockets.get(socketId);
            if (clientSocket && clientSocket.data.user) {
                const sanitized = sanitizeGameStateForPlayer(state, clientSocket.data.user.userId);
                clientSocket.emit('game:state_sync', sanitized);
            }
        }
    }
    /**
     * Broadcasts sanitized state for WAITING lobby room so players see seats & bot buttons.
     */
    async syncWaitingState(matchId) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                participants: {
                    include: { user: true },
                    orderBy: { seatIndex: 'asc' },
                },
            },
        });
        if (!match)
            return;
        const dummySeats = [
            {
                seatIndex: 0,
                userId: '',
                username: '',
                isBot: false,
                isOnline: false,
                score: 0,
                role: 'NONE',
                handCount: 0,
                tricksWon: 0,
                cardPointsWon: 0,
            },
            {
                seatIndex: 1,
                userId: '',
                username: '',
                isBot: false,
                isOnline: false,
                score: 0,
                role: 'NONE',
                handCount: 0,
                tricksWon: 0,
                cardPointsWon: 0,
            },
            {
                seatIndex: 2,
                userId: '',
                username: '',
                isBot: false,
                isOnline: false,
                score: 0,
                role: 'NONE',
                handCount: 0,
                tricksWon: 0,
                cardPointsWon: 0,
            },
        ];
        for (const p of match.participants) {
            if (p.seatIndex >= 0 && p.seatIndex <= 2) {
                dummySeats[p.seatIndex] = {
                    seatIndex: p.seatIndex,
                    userId: p.userId,
                    username: p.isBot ? p.botName || 'Bot' : p.user.username,
                    isBot: p.isBot,
                    isOnline: true,
                    score: p.currentMatchScore,
                    role: 'NONE',
                    handCount: 0,
                    tricksWon: 0,
                    cardPointsWon: 0,
                };
            }
        }
        const room = `match:${matchId}`;
        const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
        if (!socketsInRoom)
            return;
        for (const socketId of socketsInRoom) {
            const clientSocket = this.io.sockets.sockets.get(socketId);
            if (clientSocket && clientSocket.data.user) {
                const uid = clientSocket.data.user.userId;
                const participant = match.participants.find((p) => p.userId === uid);
                const mySeatIndex = participant ? participant.seatIndex : null;
                const timerConfig = match.liveGameState?.timerConfig ??
                    match.liveGameState?.timer?.config ?? {
                    enabled: true,
                    turnTimeLimit: 60,
                    totalTimeBank: 300,
                };
                const chatEnabled = match.liveGameState?.chatEnabled ?? true;
                const waitingState = {
                    matchId: match.id,
                    code: match.code,
                    status: 'WAITING',
                    isPrivate: match.isPrivate,
                    chatEnabled,
                    chatMessages: match.liveGameState?.chatMessages || [],
                    totalRounds: match.totalRounds,
                    currentRound: match.currentRound,
                    phase: 'WAITING_FOR_PLAYERS',
                    dealerSeat: 0,
                    currentTurnSeat: 0,
                    declarerSeat: null,
                    gameMode: null,
                    minMode: null,
                    talonTaken: false,
                    mySeatIndex,
                    players: dummySeats,
                    myHand: [],
                    talonCount: 3,
                    talonCards: null,
                    currentTrick: [],
                    trickLeadSeat: 0,
                    lastTrick: null,
                    declarerCardPoints: 0,
                    defenderCardPoints: 0,
                    biddingState: {
                        phase: 'OPENING',
                        currentBid: 0,
                        holderSeat: null,
                        challengerSeat: null,
                        currentTurnSeat: 0,
                        passedSeats: [],
                        history: [],
                    },
                    lastRoundResult: null,
                    matchResult: null,
                    legalCardIdsToPlay: [],
                    timer: {
                        config: timerConfig,
                        playerBanks: [timerConfig.totalTimeBank, timerConfig.totalTimeBank, timerConfig.totalTimeBank],
                        turnStartedAt: null,
                        turnDuration: timerConfig.turnTimeLimit,
                    },
                };
                clientSocket.emit('game:state_sync', waitingState);
            }
        }
    }
    /**
     * Handles player joining the match socket room.
     */
    async handlePlayerJoin(socket, matchId, userId) {
        socket.join(`match:${matchId}`);
        let state = await this.getOrLoadMatchState(matchId);
        if (!state) {
            let match = await prisma.match.findUnique({
                where: { id: matchId },
                include: {
                    participants: {
                        include: { user: true },
                        orderBy: { seatIndex: 'asc' },
                    },
                },
            });
            if (!match) {
                socket.emit('game:error', { message: 'Spiel nicht gefunden.' });
                return;
            }
            // If user is not yet a participant and match is WAITING with free seats, auto-seat them!
            const isParticipant = match.participants.some((p) => p.userId === userId);
            if (!isParticipant && match.status === 'WAITING' && match.participants.length < 3) {
                const takenSeats = match.participants.map((p) => p.seatIndex);
                const freeSeat = [0, 1, 2].find((s) => !takenSeats.includes(s));
                if (freeSeat !== undefined) {
                    await prisma.matchParticipant.create({
                        data: {
                            matchId: match.id,
                            userId,
                            seatIndex: freeSeat,
                        },
                    });
                    // Refresh match participants
                    match = (await prisma.match.findUnique({
                        where: { id: matchId },
                        include: {
                            participants: {
                                include: { user: true },
                                orderBy: { seatIndex: 'asc' },
                            },
                        },
                    }));
                }
            }
            // If match is WAITING and now has 3 participants, initialize game state and start!
            if (match.status === 'WAITING' && match.participants.length === 3) {
                const players = match.participants.map((p) => ({
                    userId: p.userId,
                    username: p.isBot ? p.botName || 'Bot' : p.user.username,
                    isBot: p.isBot,
                }));
                const timerConfig = match.liveGameState?.timerConfig ??
                    match.liveGameState?.timer?.config;
                const chatEnabled = match.liveGameState?.chatEnabled ?? true;
                state = GameEngine.createInitialState(match.id, match.code, match.totalRounds, players, timerConfig, chatEnabled);
                state.isPrivate = match.isPrivate;
                state.chatMessages = match.liveGameState?.chatMessages || [];
                this.activeMatches.set(matchId, state);
                await this.persistMatchState(state);
                this.startTurnTimer(matchId, state);
            }
            else if (match.status === 'WAITING') {
                // Broadcast waiting room state so players see seats & bot buttons!
                await this.syncWaitingState(matchId);
                return;
            }
        }
        if (!state || !Array.isArray(state.players))
            return;
        // Set player online status
        const seatIdx = state.players.findIndex((p) => p && p.userId === userId);
        if (seatIdx !== -1 && state.players[seatIdx]) {
            state.players[seatIdx].isOnline = true;
        }
        this.syncStateToMatch(matchId, state);
        // Trigger bot if it is bot's turn
        this.checkAndTriggerBot(matchId, state);
    }
    /**
     * Handles player bidding action.
     */
    async handlePlayerBid(socket, matchId, userId, action, bidValue) {
        const state = await this.getOrLoadMatchState(matchId);
        if (!state || !Array.isArray(state.players))
            throw new Error('Spiel nicht gefunden.');
        const seatIdx = state.players.findIndex((p) => p && p.userId === userId);
        if (seatIdx === -1)
            throw new Error('Du bist kein Mitspieler in diesem Raum.');
        this.deductTurnTime(state, seatIdx);
        GameEngine.handleBid(state, seatIdx, action, bidValue);
        await this.persistMatchState(state);
        this.syncStateToMatch(matchId, state);
        this.startTurnTimer(matchId, state);
        this.checkAndTriggerBot(matchId, state);
    }
    /**
     * Handles talon pickup, discard, and declaration.
     */
    async handlePlayerTalonAction(socket, matchId, userId, action, discardedCardIds, selectedMode) {
        const state = await this.getOrLoadMatchState(matchId);
        if (!state || !Array.isArray(state.players))
            throw new Error('Spiel nicht gefunden.');
        const seatIdx = state.players.findIndex((p) => p && p.userId === userId);
        if (seatIdx === -1)
            throw new Error('Du bist kein Mitspieler in diesem Raum.');
        this.deductTurnTime(state, seatIdx);
        GameEngine.handleTalonAction(state, seatIdx, action, discardedCardIds, selectedMode);
        await this.persistMatchState(state);
        this.syncStateToMatch(matchId, state);
        this.startTurnTimer(matchId, state);
        this.checkAndTriggerBot(matchId, state);
    }
    /**
     * Handles card play in trick play.
     */
    async handlePlayerPlayCard(socket, matchId, userId, cardId) {
        const state = await this.getOrLoadMatchState(matchId);
        if (!state || !Array.isArray(state.players))
            throw new Error('Spiel nicht gefunden.');
        const seatIdx = state.players.findIndex((p) => p && p.userId === userId);
        if (seatIdx === -1)
            throw new Error('Du bist kein Mitspieler in diesem Raum.');
        if (state.currentTrick.length >= 3) {
            throw new Error('Der vorherige Stich wird noch ausgewertet.');
        }
        this.deductTurnTime(state, seatIdx);
        const result = GameEngine.handlePlayCard(state, seatIdx, cardId);
        await this.processTrickPlayResult(matchId, result);
    }
    /**
     * Processes trick play result (human or bot move).
     * If the trick was completed (3 cards played), holds the 3 cards on the table for at least 3 seconds
     * so all players can clearly view the 3rd card, the trick winner, and the points before clearing.
     */
    async processTrickPlayResult(matchId, result) {
        await this.persistMatchState(result.state);
        this.syncStateToMatch(matchId, result.state);
        if (result.trickCompleted) {
            this.clearTurnTimer(matchId);
            // Clear any existing trick review timer for this match
            if (this.trickTimers.has(matchId)) {
                clearTimeout(this.trickTimers.get(matchId));
                this.trickTimers.delete(matchId);
            }
            // Hold trick visible on table for at least 3 seconds (3200ms)
            const timer = setTimeout(async () => {
                try {
                    this.trickTimers.delete(matchId);
                    const liveState = this.activeMatches.get(matchId);
                    if (!liveState)
                        return;
                    // Clear completed trick from table
                    GameEngine.clearCurrentTrick(liveState);
                    if (result.roundEnded) {
                        await this.handleRoundEnd(matchId, liveState);
                        return;
                    }
                    await this.persistMatchState(liveState);
                    this.syncStateToMatch(matchId, liveState);
                    // Start timer for the next turn player & trigger bot if applicable
                    this.startTurnTimer(matchId, liveState);
                    this.checkAndTriggerBot(matchId, liveState);
                }
                catch (err) {
                    console.error('Error resolving completed trick:', err);
                }
            }, 3200);
            this.trickTimers.set(matchId, timer);
            return;
        }
        // Trick not completed yet (card 1 or 2): trigger bot move if applicable & start timer
        this.startTurnTimer(matchId, result.state);
        this.checkAndTriggerBot(matchId, result.state);
    }
    /**
     * Handles round end: saves round history to DB, handles match completion.
     */
    async handleRoundEnd(matchId, state) {
        this.clearTurnTimer(matchId);
        const lastResult = state.lastRoundResult;
        if (lastResult) {
            try {
                await prisma.matchRound.create({
                    data: {
                        matchId,
                        roundNumber: lastResult.roundNumber,
                        dealerSeat: lastResult.dealerSeat,
                        declarerSeat: lastResult.declarerSeat,
                        gameMode: lastResult.gameMode,
                        declarerWon: lastResult.declarerWon,
                        declarerCardPoints: lastResult.declarerCardPoints,
                        defenderCardPoints: lastResult.defenderCardPoints,
                        scoreDeltaDeclarer: lastResult.scoreDeltaDeclarer,
                        scoreDeltaDefenders: lastResult.scoreDeltaDefenders,
                    },
                });
            }
            catch (err) {
                console.error('Error saving match round:', err);
            }
        }
        if (state.phase === 'MATCH_COMPLETED' && state.matchResult) {
            await this.handleMatchCompletion(matchId, state, state.matchResult);
        }
        // Persist final round summary state to DB so currentTrick is cleared on reload
        await this.persistMatchState(state);
        this.syncStateToMatch(matchId, state);
    }
    /**
     * Handles match completion: updates final rankings, ELO ratings, lifetime scores.
     */
    async handleMatchCompletion(matchId, state, result) {
        try {
            const matchExists = await prisma.match.findUnique({
                where: { id: matchId },
                select: { id: true },
            });
            if (!matchExists) {
                this.activeMatches.delete(matchId);
                return;
            }
            await prisma.match.update({
                where: { id: matchId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    liveGameState: state,
                },
            });
            for (const r of result.rankings) {
                if (!r.isBot) {
                    // Update MatchParticipant finalRank
                    await prisma.matchParticipant.updateMany({
                        where: { matchId, userId: r.userId },
                        data: {
                            finalRank: r.rank,
                            currentMatchScore: r.finalScore,
                        },
                    });
                    // Check how many solo games this player played/won in this match
                    const rounds = await prisma.matchRound.findMany({
                        where: { matchId },
                    });
                    const seat = Array.isArray(state.players)
                        ? state.players.findIndex((p) => p && p.userId === r.userId)
                        : -1;
                    const soloRounds = rounds.filter((rnd) => rnd.declarerSeat === seat);
                    const soloWon = soloRounds.filter((rnd) => rnd.declarerWon).length;
                    // Update User permanent statistics & ELO
                    await prisma.user.update({
                        where: { id: r.userId },
                        data: {
                            lifetimeScore: { increment: r.finalScore },
                            eloRating: { increment: r.eloDelta },
                            matchesPlayed: { increment: 1 },
                            matchesWon: r.rank === 1 ? { increment: 1 } : undefined,
                            soloGamesPlayed: { increment: soloRounds.length },
                            soloGamesWon: { increment: soloWon },
                        },
                    });
                }
            }
        }
        catch (err) {
            console.error('Error recording match completion:', err);
        }
    }
    /**
     * Advances to next round.
     */
    async handleNextRound(socket, matchId, userId) {
        const state = await this.getOrLoadMatchState(matchId);
        if (!state)
            throw new Error('Spiel nicht gefunden.');
        if (state.phase !== 'ROUND_SUMMARY') {
            return;
        }
        GameEngine.advanceToNextRound(state);
        await this.persistMatchState(state);
        this.syncStateToMatch(matchId, state);
        this.startTurnTimer(matchId, state);
        this.checkAndTriggerBot(matchId, state);
    }
    /**
     * Adds a Bot to a free seat.
     */
    async handleAddBot(socket, matchId, userId, seatIndex) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { participants: true },
        });
        if (!match || match.status !== 'WAITING') {
            throw new Error('Bot kann nur vor Spielstart hinzugefügt werden.');
        }
        if (match.hostId !== userId) {
            throw new Error('Nur der Raum-Ersteller kann Bots hinzufügen.');
        }
        const botNames = ['Hansi (Bot)', 'Franzl (Bot)', 'Resi (Bot)', 'Luggi (Bot)'];
        const botName = botNames[seatIndex] || `Bot ${seatIndex + 1}`;
        const botUserId = `bot_${seatIndex}_${Date.now()}`;
        // Create a dummy user for bot or insert directly as participant
        const botUser = await prisma.user.upsert({
            where: { username: botName },
            update: {},
            create: {
                username: botName,
                email: `${botUserId}@bot.spielfranzen.local`,
                passwordHash: 'bot_hash',
            },
        });
        await prisma.matchParticipant.create({
            data: {
                matchId,
                userId: botUser.id,
                seatIndex,
                isBot: true,
                botName,
            },
        });
        // Check if 3 participants are now ready
        const updatedMatch = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                participants: {
                    include: { user: true },
                    orderBy: { seatIndex: 'asc' },
                },
            },
        });
        if (updatedMatch && updatedMatch.participants.length === 3) {
            const players = updatedMatch.participants.map((p) => ({
                userId: p.userId,
                username: p.isBot ? p.botName || 'Bot' : p.user.username,
                isBot: p.isBot,
            }));
            const timerConfig = updatedMatch.liveGameState?.timerConfig ??
                updatedMatch.liveGameState?.timer?.config;
            const chatEnabled = updatedMatch.liveGameState?.chatEnabled ?? true;
            const state = GameEngine.createInitialState(updatedMatch.id, updatedMatch.code, updatedMatch.totalRounds, players, timerConfig, chatEnabled);
            state.isPrivate = updatedMatch.isPrivate;
            state.chatMessages = updatedMatch.liveGameState?.chatMessages || [];
            this.activeMatches.set(matchId, state);
            await this.persistMatchState(state);
            this.syncStateToMatch(matchId, state);
            this.startTurnTimer(matchId, state);
            this.checkAndTriggerBot(matchId, state);
        }
        else {
            // 1 or 2 participants: sync waiting room state so clients see the added bot!
            await this.syncWaitingState(matchId);
        }
    }
    /**
     * Removes a Bot.
     */
    async handleRemoveBot(socket, matchId, userId, seatIndex) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { participants: true },
        });
        if (!match || match.status !== 'WAITING') {
            throw new Error('Bot kann nur vor Spielstart entfernt werden.');
        }
        if (match.hostId !== userId) {
            throw new Error('Nur der Raum-Ersteller kann Bots verwalten.');
        }
        await prisma.matchParticipant.deleteMany({
            where: { matchId, seatIndex, isBot: true },
        });
        // Sync updated waiting room state
        await this.syncWaitingState(matchId);
    }
    /**
     * Checks if the active turn belongs to a Bot and executes bot move after a realistic delay.
     */
    checkAndTriggerBot(matchId, state) {
        if (state.status !== 'IN_PROGRESS')
            return;
        if (state.phase === 'ROUND_SUMMARY' || state.phase === 'MATCH_COMPLETED')
            return;
        if (state.currentTrick.length >= 3)
            return; // Wait for the 3-second trick review to conclude
        const currentSeat = state.currentTurnSeat;
        const player = state.players[currentSeat];
        if (!player || !player.isBot)
            return;
        // Clear any existing timer for this match
        if (this.botTimers.has(matchId)) {
            clearTimeout(this.botTimers.get(matchId));
            this.botTimers.delete(matchId);
        }
        // Realistic 1 second thinking time for Bots across all phases (Trick Play, Bidding, Talon)
        const delay = 1000;
        const timer = setTimeout(async () => {
            try {
                const liveState = this.activeMatches.get(matchId);
                if (!liveState || liveState.currentTurnSeat !== currentSeat)
                    return;
                // Verify match still exists in DB
                const matchExists = await prisma.match.findUnique({
                    where: { id: matchId },
                    select: { id: true },
                });
                if (!matchExists) {
                    this.activeMatches.delete(matchId);
                    this.botTimers.delete(matchId);
                    return;
                }
                if (liveState.phase === 'BIDDING') {
                    this.deductTurnTime(liveState, currentSeat);
                    const decision = BotEngine.decideBidAction(liveState, currentSeat);
                    GameEngine.handleBid(liveState, currentSeat, decision.action, decision.bidValue);
                    await this.persistMatchState(liveState);
                    this.syncStateToMatch(matchId, liveState);
                    this.startTurnTimer(matchId, liveState);
                    this.checkAndTriggerBot(matchId, liveState);
                    return;
                }
                if (liveState.phase === 'TALON_AND_DECLARATION') {
                    this.deductTurnTime(liveState, currentSeat);
                    const decision = BotEngine.decideTalonAction(liveState, currentSeat);
                    GameEngine.handleTalonAction(liveState, currentSeat, decision.action, decision.discardedCardIds, decision.selectedMode);
                    await this.persistMatchState(liveState);
                    this.syncStateToMatch(matchId, liveState);
                    this.startTurnTimer(matchId, liveState);
                    this.checkAndTriggerBot(matchId, liveState);
                    return;
                }
                if (liveState.phase === 'TRICK_PLAY') {
                    if (liveState.currentTrick.length >= 3)
                        return;
                    this.deductTurnTime(liveState, currentSeat);
                    const cardId = BotEngine.decideCardToPlay(liveState, currentSeat);
                    const result = GameEngine.handlePlayCard(liveState, currentSeat, cardId);
                    await this.processTrickPlayResult(matchId, result);
                    return;
                }
            }
            catch (err) {
                console.error('Error executing bot move:', err);
            }
        }, delay);
        this.botTimers.set(matchId, timer);
    }
    /**
     * Clears active turn timeout timer for a match.
     */
    clearTurnTimer(matchId) {
        if (this.turnTimers.has(matchId)) {
            clearTimeout(this.turnTimers.get(matchId));
            this.turnTimers.delete(matchId);
        }
    }
    /**
     * Deducts elapsed turn time from player's total match time bank.
     */
    deductTurnTime(state, seatIndex) {
        if (!state.timer?.config?.enabled)
            return;
        if (state.timer.turnStartedAt !== null) {
            const elapsed = Math.max(0, Math.floor((Date.now() - state.timer.turnStartedAt) / 1000));
            const currentBank = state.timer.playerBanks[seatIndex] ?? state.timer.config.totalTimeBank;
            state.timer.playerBanks[seatIndex] = Math.max(0, currentBank - elapsed);
            state.timer.turnStartedAt = null;
        }
    }
    /**
     * Starts thinking timer for the active turn player.
     */
    startTurnTimer(matchId, state) {
        this.clearTurnTimer(matchId);
        if (!state.timer?.config?.enabled) {
            if (state.timer)
                state.timer.turnStartedAt = null;
            return;
        }
        if (state.status !== 'IN_PROGRESS') {
            state.timer.turnStartedAt = null;
            return;
        }
        let activeSeat = null;
        if (state.phase === 'BIDDING') {
            activeSeat = state.biddingState.currentTurnSeat;
        }
        else if (state.phase === 'TALON_AND_DECLARATION') {
            activeSeat = state.declarerSeat;
        }
        else if (state.phase === 'TRICK_PLAY') {
            if (state.currentTrick.length >= 3) {
                state.timer.turnStartedAt = null;
                return;
            }
            activeSeat = state.currentTurnSeat;
        }
        if (activeSeat === null || activeSeat < 0 || activeSeat > 2) {
            state.timer.turnStartedAt = null;
            return;
        }
        const bankRemaining = state.timer.playerBanks[activeSeat] ?? state.timer.config.totalTimeBank;
        const maxTurnLimit = state.timer.config.turnTimeLimit;
        // Guarantee at least 15s per turn so players are NEVER rushed with 0s to make a move
        const turnDuration = Math.max(15, Math.min(maxTurnLimit, bankRemaining));
        state.timer.turnDuration = turnDuration;
        state.timer.turnStartedAt = Date.now();
        // Broadcast the new turn timer to clients immediately so they see the clock start ticking!
        this.syncStateToMatch(matchId, state);
        // Timeout duration in ms (+ 500ms grace period for network latency)
        const timeoutMs = (turnDuration + 0.5) * 1000;
        const timer = setTimeout(async () => {
            try {
                await this.handleTurnTimeout(matchId, activeSeat);
            }
            catch (err) {
                console.error(`Error in handleTurnTimeout for match ${matchId}:`, err);
            }
        }, timeoutMs);
        this.turnTimers.set(matchId, timer);
    }
    /**
     * Handles timeout when a player runs out of thinking time:
     * "bei zeitüberschreitung wird einfach ein zufälliger gültiger zug gemacht"
     */
    async handleTurnTimeout(matchId, seatIndex) {
        this.clearTurnTimer(matchId);
        const state = this.activeMatches.get(matchId);
        if (!state || state.status !== 'IN_PROGRESS')
            return;
        // Deduct remaining time for this turn
        if (state.timer?.config?.enabled) {
            const currentBank = state.timer.playerBanks[seatIndex] ?? state.timer.config.totalTimeBank;
            state.timer.playerBanks[seatIndex] = Math.max(0, currentBank - state.timer.turnDuration);
            state.timer.turnStartedAt = null;
        }
        // 1. TIMEOUT IN BIDDING PHASE
        if (state.phase === 'BIDDING') {
            if (state.biddingState.currentTurnSeat !== seatIndex)
                return;
            GameEngine.handleBid(state, seatIndex, 'pass');
            await this.persistMatchState(state);
            this.syncStateToMatch(matchId, state);
            if (state.phase === 'BIDDING' ||
                state.phase === 'TALON_AND_DECLARATION' ||
                state.phase === 'DEALING') {
                this.startTurnTimer(matchId, state);
                this.checkAndTriggerBot(matchId, state);
            }
            return;
        }
        // 2. TIMEOUT IN TALON & DECLARATION PHASE
        if (state.phase === 'TALON_AND_DECLARATION') {
            if (state.declarerSeat !== seatIndex)
                return;
            const minMode = state.minMode || 5;
            if (minMode >= 11) {
                GameEngine.handleTalonAction(state, seatIndex, 'declare_hand', undefined, minMode);
            }
            else if (!state.talonRevealed) {
                GameEngine.handleTalonAction(state, seatIndex, 'take_talon');
            }
            else {
                const botDecision = BotEngine.decideTalonAction(state, seatIndex);
                const discardIds = botDecision.discardedCardIds ||
                    [...state.hands[seatIndex], ...state.talon].slice(0, 3).map((c) => c.id);
                const selectedMode = botDecision.selectedMode || minMode;
                GameEngine.handleTalonAction(state, seatIndex, 'discard_and_declare', discardIds, selectedMode);
            }
            await this.persistMatchState(state);
            this.syncStateToMatch(matchId, state);
            this.startTurnTimer(matchId, state);
            this.checkAndTriggerBot(matchId, state);
            return;
        }
        // 3. TIMEOUT IN TRICK PLAY PHASE
        if (state.phase === 'TRICK_PLAY') {
            if (state.currentTurnSeat !== seatIndex || state.currentTrick.length >= 3)
                return;
            const legalCards = GameEngine.getLegalCardsToPlay(state, seatIndex);
            if (legalCards.length === 0)
                return;
            // Pick random legal card: "bei zeitüberschreitung wird einfach ein zufälliger gültiger zug gemacht"
            const randomCard = legalCards[Math.floor(Math.random() * legalCards.length)];
            const result = GameEngine.handlePlayCard(state, seatIndex, randomCard.id);
            await this.processTrickPlayResult(matchId, result);
        }
    }
    /**
     * Handles sending a real-time chat message in a match.
     */
    async handleSendChatMessage(socket, matchId, userId, rawText) {
        if (!rawText || typeof rawText !== 'string')
            return;
        const text = rawText.trim();
        if (!text || text.length > 300)
            return;
        // 1. Check if match is already active in memory or DB
        const state = await this.getOrLoadMatchState(matchId);
        if (state) {
            if (state.chatEnabled === false) {
                throw new Error('Der Chat ist in diesem Spiel deaktiviert.');
            }
            const player = state.players.find((p) => p && p.userId === userId);
            if (!player) {
                throw new Error('Du bist kein Mitspieler in diesem Raum.');
            }
            const message = {
                id: crypto.randomUUID(),
                matchId,
                senderId: userId,
                senderName: player.username,
                senderSeat: player.seatIndex,
                isBot: false,
                text,
                createdAt: Date.now(),
            };
            if (!state.chatMessages) {
                state.chatMessages = [];
            }
            state.chatMessages.push(message);
            if (state.chatMessages.length > 50) {
                state.chatMessages = state.chatMessages.slice(-50);
            }
            await this.persistMatchState(state);
            this.io.to(`match:${matchId}`).emit('chat:new_message', message);
            return;
        }
        // 2. If match is still WAITING (before 3 players filled)
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                participants: {
                    include: { user: true },
                },
            },
        });
        if (!match)
            return;
        const chatEnabled = match.liveGameState?.chatEnabled ?? true;
        if (chatEnabled === false) {
            throw new Error('Der Chat ist in diesem Spiel deaktiviert.');
        }
        const participant = match.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new Error('Du bist kein Mitspieler in diesem Raum.');
        }
        const message = {
            id: crypto.randomUUID(),
            matchId,
            senderId: userId,
            senderName: participant.user.username,
            senderSeat: participant.seatIndex,
            isBot: false,
            text,
            createdAt: Date.now(),
        };
        const currentLgs = match.liveGameState || {};
        const currentMsgs = currentLgs.chatMessages || [];
        currentMsgs.push(message);
        const trimmedMsgs = currentMsgs.slice(-50);
        await prisma.match.update({
            where: { id: matchId },
            data: {
                liveGameState: {
                    ...currentLgs,
                    chatMessages: trimmedMsgs,
                },
            },
        });
        this.io.to(`match:${matchId}`).emit('chat:new_message', message);
    }
}
//# sourceMappingURL=gameSocket.js.map