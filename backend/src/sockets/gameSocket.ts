import {
  ClientToServerEvents,
  FullGameState,
  MatchResult,
  RoundResult,
  ServerToClientEvents,
  Trick,
} from '@spielfranzen/shared';
import { Server, Socket } from 'socket.io';
import { prisma } from '../db/prisma.js';
import { BotEngine } from '../game/BotEngine.js';
import { GameEngine } from '../game/GameEngine.js';
import { sanitizeGameStateForPlayer } from '../game/sanitizer.js';
import { AuthUserPayload } from '../middleware/auth.js';

interface SocketData {
  user: AuthUserPayload;
}

export class GameSocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  private activeMatches: Map<string, FullGameState> = new Map();
  // Map of userId -> Set of socket IDs
  private userSockets: Map<string, Set<string>> = new Map();
  // Map of matchId -> active Bot timeout timer
  private botTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  ) {
    this.io = io;
  }

  public register(): void {
    this.io.on('connection', async (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
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
      this.userSockets.get(userId)!.add(socket.id);

      // Handle match joining
      socket.on('game:join_match', async ({ matchId }) => {
        try {
          await this.handlePlayerJoin(socket, matchId, userId);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Fehler beim Beitreten des Spiels.' });
        }
      });

      // Handle bidding
      socket.on('game:bid', async ({ matchId, action, bidValue }) => {
        try {
          await this.handlePlayerBid(socket, matchId, userId, action, bidValue);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Ungültiges Gebot.' });
        }
      });

      // Handle talon action
      socket.on('game:talon_action', async ({ matchId, action, discardedCardIds, selectedMode }) => {
        try {
          await this.handlePlayerTalonAction(
            socket,
            matchId,
            userId,
            action,
            discardedCardIds,
            selectedMode,
          );
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Ungültige Talon-Aktion.' });
        }
      });

      // Handle card play
      socket.on('game:play_card', async ({ matchId, cardId }) => {
        try {
          await this.handlePlayerPlayCard(socket, matchId, userId, cardId);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Ungültige Karte.' });
        }
      });

      // Handle next round advance
      socket.on('game:next_round', async ({ matchId }) => {
        try {
          await this.handleNextRound(socket, matchId, userId);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Fehler beim Rundenwechsel.' });
        }
      });

      // Handle adding a Bot
      socket.on('game:add_bot', async ({ matchId, seatIndex }) => {
        try {
          await this.handleAddBot(socket, matchId, userId, seatIndex);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Fehler beim Hinzufügen des Bots.' });
        }
      });

      // Handle removing a Bot
      socket.on('game:remove_bot', async ({ matchId, seatIndex }) => {
        try {
          await this.handleRemoveBot(socket, matchId, userId, seatIndex);
        } catch (err: any) {
          socket.emit('game:error', { message: err.message || 'Fehler beim Entfernen des Bots.' });
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
              const seatIdx = state.players.findIndex((p) => p.userId === userId);
              if (seatIdx !== -1) {
                state.players[seatIdx]!.isOnline = false;
                this.syncStateToMatch(matchId, state);
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
  private async getOrLoadMatchState(matchId: string): Promise<FullGameState | null> {
    if (this.activeMatches.has(matchId)) {
      return this.activeMatches.get(matchId)!;
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

    if (!match) return null;

    if (match.liveGameState) {
      const state = match.liveGameState as unknown as FullGameState;
      this.activeMatches.set(matchId, state);
      return state;
    }

    return null;
  }

  /**
   * Persists match state to PostgreSQL.
   */
  private async persistMatchState(state: FullGameState): Promise<void> {
    try {
      await prisma.match.update({
        where: { id: state.matchId },
        data: {
          status: state.status,
          currentRound: state.currentRound,
          liveGameState: state as any,
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
    } catch (err) {
      console.error('Error persisting match state:', err);
    }
  }

  /**
   * Broadcasts sanitized state to each player in the match.
   */
  private syncStateToMatch(matchId: string, state: FullGameState): void {
    const room = `match:${matchId}`;
    const socketsInRoom = this.io.sockets.adapter.rooms.get(room);

    if (!socketsInRoom) return;

    for (const socketId of socketsInRoom) {
      const clientSocket = this.io.sockets.sockets.get(socketId);
      if (clientSocket && clientSocket.data.user) {
        const sanitized = sanitizeGameStateForPlayer(state, clientSocket.data.user.userId);
        clientSocket.emit('game:state_sync', sanitized);
      }
    }
  }

  /**
   * Handles player joining the match socket room.
   */
  private async handlePlayerJoin(socket: Socket, matchId: string, userId: string): Promise<void> {
    socket.join(`match:${matchId}`);

    let state = await this.getOrLoadMatchState(matchId);

    if (!state) {
      // Check if match exists and can be started
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          participants: {
            include: { user: true },
            orderBy: { seatIndex: 'asc' },
          },
        },
      });

      if (!match) {
        throw new Error('Spiel nicht gefunden.');
      }

      // If match is WAITING and has 3 participants, initialize game state
      if (match.status === 'WAITING' && match.participants.length === 3) {
        const players = match.participants.map((p) => ({
          userId: p.userId,
          username: p.isBot ? p.botName || 'Bot' : p.user.username,
          isBot: p.isBot,
        }));

        state = GameEngine.createInitialState(match.id, match.code, match.totalRounds, players);
        this.activeMatches.set(matchId, state);
        await this.persistMatchState(state);
      } else {
        // Send basic sync or wait
        return;
      }
    }

    // Set player online status
    const seatIdx = state.players.findIndex((p) => p.userId === userId);
    if (seatIdx !== -1) {
      state.players[seatIdx]!.isOnline = true;
    }

    this.syncStateToMatch(matchId, state);

    // Trigger bot if it is bot's turn
    this.checkAndTriggerBot(matchId, state);
  }

  /**
   * Handles player bidding action.
   */
  private async handlePlayerBid(
    socket: Socket,
    matchId: string,
    userId: string,
    action: 'open' | 'raise' | 'hold' | 'pass',
    bidValue?: number,
  ): Promise<void> {
    const state = await this.getOrLoadMatchState(matchId);
    if (!state) throw new Error('Spiel nicht gefunden.');

    const seatIdx = state.players.findIndex((p) => p.userId === userId);
    if (seatIdx === -1) throw new Error('Du bist kein Mitspieler in diesem Raum.');

    GameEngine.handleBid(state, seatIdx, action, bidValue);
    await this.persistMatchState(state);
    this.syncStateToMatch(matchId, state);

    this.checkAndTriggerBot(matchId, state);
  }

  /**
   * Handles talon pickup, discard, and declaration.
   */
  private async handlePlayerTalonAction(
    socket: Socket,
    matchId: string,
    userId: string,
    action: 'take_talon' | 'declare_hand',
    discardedCardIds?: string[],
    selectedMode?: number,
  ): Promise<void> {
    const state = await this.getOrLoadMatchState(matchId);
    if (!state) throw new Error('Spiel nicht gefunden.');

    const seatIdx = state.players.findIndex((p) => p.userId === userId);
    if (seatIdx === -1) throw new Error('Du bist kein Mitspieler in diesem Raum.');

    GameEngine.handleTalonAction(state, seatIdx, action, discardedCardIds, selectedMode);
    await this.persistMatchState(state);
    this.syncStateToMatch(matchId, state);

    this.checkAndTriggerBot(matchId, state);
  }

  /**
   * Handles card play in trick play.
   */
  private async handlePlayerPlayCard(
    socket: Socket,
    matchId: string,
    userId: string,
    cardId: string,
  ): Promise<void> {
    const state = await this.getOrLoadMatchState(matchId);
    if (!state) throw new Error('Spiel nicht gefunden.');

    const seatIdx = state.players.findIndex((p) => p.userId === userId);
    if (seatIdx === -1) throw new Error('Du bist kein Mitspieler in diesem Raum.');

    const result = GameEngine.handlePlayCard(state, seatIdx, cardId);

    await this.persistMatchState(result.state);
    this.syncStateToMatch(matchId, result.state);

    if (result.roundEnded) {
      await this.handleRoundEnd(matchId, result.state);
      return;
    }

    this.checkAndTriggerBot(matchId, result.state);
  }

  /**
   * Handles round end: saves round history to DB, handles match completion.
   */
  private async handleRoundEnd(matchId: string, state: FullGameState): Promise<void> {
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
      } catch (err) {
        console.error('Error saving match round:', err);
      }
    }

    if (state.phase === 'MATCH_COMPLETED' && state.matchResult) {
      await this.handleMatchCompletion(matchId, state, state.matchResult);
    }

    this.syncStateToMatch(matchId, state);
  }

  /**
   * Handles match completion: updates final rankings, ELO ratings, lifetime scores.
   */
  private async handleMatchCompletion(
    matchId: string,
    state: FullGameState,
    result: MatchResult,
  ): Promise<void> {
    try {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          liveGameState: state as any,
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

          const seat = state.players.findIndex((p) => p.userId === r.userId);
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
    } catch (err) {
      console.error('Error recording match completion:', err);
    }
  }

  /**
   * Advances to next round.
   */
  private async handleNextRound(
    socket: Socket,
    matchId: string,
    userId: string,
  ): Promise<void> {
    const state = await this.getOrLoadMatchState(matchId);
    if (!state) throw new Error('Spiel nicht gefunden.');

    if (state.phase !== 'ROUND_SUMMARY') {
      return;
    }

    GameEngine.advanceToNextRound(state);
    await this.persistMatchState(state);
    this.syncStateToMatch(matchId, state);

    this.checkAndTriggerBot(matchId, state);
  }

  /**
   * Adds a Bot to a free seat.
   */
  private async handleAddBot(
    socket: Socket,
    matchId: string,
    userId: string,
    seatIndex: number,
  ): Promise<void> {
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

      const state = GameEngine.createInitialState(
        updatedMatch.id,
        updatedMatch.code,
        updatedMatch.totalRounds,
        players,
      );
      this.activeMatches.set(matchId, state);
      await this.persistMatchState(state);
      this.syncStateToMatch(matchId, state);
      this.checkAndTriggerBot(matchId, state);
    }
  }

  /**
   * Removes a Bot.
   */
  private async handleRemoveBot(
    socket: Socket,
    matchId: string,
    userId: string,
    seatIndex: number,
  ): Promise<void> {
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
  }

  /**
   * Checks if the active turn belongs to a Bot and executes bot move after a realistic delay.
   */
  private checkAndTriggerBot(matchId: string, state: FullGameState): void {
    if (state.status !== 'IN_PROGRESS') return;
    if (state.phase === 'ROUND_SUMMARY' || state.phase === 'MATCH_COMPLETED') return;

    const currentSeat = state.currentTurnSeat;
    const player = state.players[currentSeat];
    if (!player || !player.isBot) return;

    // Clear any existing timer for this match
    if (this.botTimers.has(matchId)) {
      clearTimeout(this.botTimers.get(matchId)!);
      this.botTimers.delete(matchId);
    }

    const delay = 800 + Math.random() * 400; // 800ms - 1200ms natural reaction time

    const timer = setTimeout(async () => {
      try {
        const liveState = this.activeMatches.get(matchId);
        if (!liveState || liveState.currentTurnSeat !== currentSeat) return;

        if (liveState.phase === 'BIDDING') {
          const decision = BotEngine.decideBidAction(liveState, currentSeat);
          GameEngine.handleBid(liveState, currentSeat, decision.action, decision.bidValue);
          await this.persistMatchState(liveState);
          this.syncStateToMatch(matchId, liveState);
          this.checkAndTriggerBot(matchId, liveState);
          return;
        }

        if (liveState.phase === 'TALON_AND_DECLARATION') {
          const decision = BotEngine.decideTalonAction(liveState, currentSeat);
          GameEngine.handleTalonAction(
            liveState,
            currentSeat,
            decision.action,
            decision.discardedCardIds,
            decision.selectedMode,
          );
          await this.persistMatchState(liveState);
          this.syncStateToMatch(matchId, liveState);
          this.checkAndTriggerBot(matchId, liveState);
          return;
        }

        if (liveState.phase === 'TRICK_PLAY') {
          const cardId = BotEngine.decideCardToPlay(liveState, currentSeat);
          const result = GameEngine.handlePlayCard(liveState, currentSeat, cardId);
          await this.persistMatchState(result.state);
          this.syncStateToMatch(matchId, result.state);

          if (result.roundEnded) {
            await this.handleRoundEnd(matchId, result.state);
            return;
          }

          this.checkAndTriggerBot(matchId, result.state);
          return;
        }
      } catch (err) {
        console.error('Error executing bot move:', err);
      }
    }, delay);

    this.botTimers.set(matchId, timer);
  }
}
