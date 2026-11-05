import {
  Card,
  CardRank,
  FullGameState,
  GamePhase,
  GameTimerConfig,
  GameType,
  MatchResult,
  PlayerSeatState,
  RoundResult,
  SCHNAPSEN_CALL_CONFIG,
  Schnapsen3Mode,
  SchnapsenCallType,
  SchnapsenKontraLevel,
  SchnapsenMode,
  SchnapsenOptions,
  SchnapsenState,
  Suit,
  Trick,
} from '@spielfranzen/shared';
import { DeckFactory } from './DeckFactory.js';
import { IGameEngine, TrickPlayResult } from './IGameEngine.js';
import { SchnapsenMoveValidator } from './SchnapsenMoveValidator.js';

export class SchnapsenEngine implements IGameEngine {
  public readonly gameType: GameType;
  public readonly mode: SchnapsenMode;
  public readonly maxPlayers: number;

  constructor(
    gameType: 'schnapsen_2' | 'schnapsen_3' | 'schnapsen_4',
    mode?: SchnapsenMode,
  ) {
    this.gameType = gameType;
    if (gameType === 'schnapsen_2') {
      this.mode = 'CLASSIC_2P';
      this.maxPlayers = 2;
    } else if (gameType === 'schnapsen_4') {
      this.mode = 'BAUERNSCHNAPSEN_4P';
      this.maxPlayers = 4;
    } else {
      this.mode = mode || 'DREIERSCHNAPSEN_3P';
      this.maxPlayers = 3;
    }
  }

  public createInitialState(
    matchId: string,
    code: string,
    totalRounds: number,
    playersData: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: GameTimerConfig,
    chatEnabled: boolean = true,
    matchName?: string,
    options?: SchnapsenOptions,
  ): FullGameState {
    const config = timerConfig ?? {
      enabled: true,
      turnTimeLimit: 60,
      totalTimeBank: 300,
    };

    const effectiveMode: SchnapsenMode =
      this.gameType === 'schnapsen_3' && options?.subMode3
        ? options.subMode3
        : this.mode;

    const initialScore =
      effectiveMode === 'CLASSIC_2P' || effectiveMode === 'MITSCHREIBEN_3P' ? 7 : 24;

    const targetBummerl = options?.targetBummerl ?? 1;
    const allowZudrehen = options?.allowZudrehen ?? true;
    const allowTrumpfTausch = options?.allowTrumpfTausch ?? true;
    const schneiderBummerl = options?.schneiderBummerl ?? true;
    const bummerlsWon = new Array(this.maxPlayers).fill(0);

    const players: PlayerSeatState[] = playersData.slice(0, this.maxPlayers).map((p, idx) => ({
      seatIndex: idx,
      userId: p.userId,
      username: p.username,
      isBot: p.isBot,
      isOnline: true,
      score: initialScore,
      role: 'NONE',
      tricksWon: 0,
      cardPointsWon: 0,
    }));

    const dealerSeat = 0;
    const deck = DeckFactory.createShuffledDeck(this.gameType);
    const hands: Card[][] = [];
    let talon: Card[] = [];
    let schnapsenState: SchnapsenState;

    if (effectiveMode === 'CLASSIC_2P') {
      // 20 cards: Vorhand 5, Dealer 5, 10 in talon with 1 face-up trump
      const vorhandSeat = 1;
      const vCards = [...deck.slice(0, 3), ...deck.slice(7, 9)];
      const dCards = [...deck.slice(3, 6), ...deck.slice(9, 11)];
      hands[0] = DeckFactory.sortCards(dCards);
      hands[1] = DeckFactory.sortCards(vCards);

      const trumpCard = deck[6]!;
      const stock = deck.slice(11); // 9 cards
      talon = [trumpCard, ...stock];

      schnapsenState = {
        mode: 'CLASSIC_2P',
        schnapsenPhase: 'TRICK_PLAY',
        talonState: 'TALON_OPEN',
        trumpSuit: trumpCard.suit,
        trumpCard,
        stockCount: 10,
        talonClosed: false,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0],
        countdownScores: [7, 7],
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };

      return this.buildFullState(
        matchId,
        code,
        matchName,
        totalRounds,
        chatEnabled,
        players,
        hands,
        talon,
        schnapsenState,
        dealerSeat,
        vorhandSeat,
        'TRICK_PLAY',
        config,
        options,
      );
    }

    if (effectiveMode === 'MITSCHREIBEN_3P') {
      // Dealer (0) sits out. Vorhand (1) & Hinterhand (2) play 2P Schnapsen.
      const p1Cards = [...deck.slice(0, 3), ...deck.slice(7, 9)];
      const p2Cards = [...deck.slice(3, 6), ...deck.slice(9, 11)];
      hands[0] = [];
      hands[1] = DeckFactory.sortCards(p1Cards);
      hands[2] = DeckFactory.sortCards(p2Cards);

      const trumpCard = deck[6]!;
      const stock = deck.slice(11);
      talon = [trumpCard, ...stock];

      schnapsenState = {
        mode: 'MITSCHREIBEN_3P',
        schnapsenPhase: 'TRICK_PLAY',
        talonState: 'TALON_OPEN',
        trumpSuit: trumpCard.suit,
        trumpCard,
        stockCount: 10,
        talonClosed: false,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0, 0],
        countdownScores: [7, 7, 7],
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        pausedDealerSeat: 0,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };

      return this.buildFullState(
        matchId,
        code,
        matchName,
        totalRounds,
        chatEnabled,
        players,
        hands,
        talon,
        schnapsenState,
        dealerSeat,
        1,
        'TRICK_PLAY',
        config,
        options,
      );
    }

    if (effectiveMode === 'DREIERSCHNAPSEN_3P') {
      // 3 cards each (9), 2 into talon, 3 cards each (9) -> 6 cards each, 2 in talon
      const p0 = [...deck.slice(0, 3), ...deck.slice(11, 14)];
      const p1 = [...deck.slice(3, 6), ...deck.slice(14, 17)];
      const p2 = [...deck.slice(6, 9), ...deck.slice(17, 20)];
      hands[0] = DeckFactory.sortCards(p0);
      hands[1] = DeckFactory.sortCards(p1);
      hands[2] = DeckFactory.sortCards(p2);
      talon = deck.slice(9, 11);

      const vorhand = (dealerSeat + 1) % 3;
      const first3 = hands[vorhand]!.slice(0, 3);
      const canRedeal3Buben = first3.filter((c) => c.rank === 5).length === 3;

      schnapsenState = {
        mode: 'DREIERSCHNAPSEN_3P',
        schnapsenPhase: 'ATOUT_SELECTION',
        talonState: 'TALON_CLOSED',
        trumpSuit: hands[vorhand]![0]!.suit,
        trumpCard: null,
        stockCount: 2,
        talonClosed: true,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0, 0],
        countdownScores: [24, 24, 24],
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        atoutSelection: {
          first3Cards: first3,
          canRedeal3Buben,
          step: 'FIRST_3',
        },
        biddingHistory: [],
        consecutivePasses: 0,
        highestBidSeat: null,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };

      return this.buildFullState(
        matchId,
        code,
        matchName,
        totalRounds,
        chatEnabled,
        players,
        hands,
        talon,
        schnapsenState,
        dealerSeat,
        vorhand,
        'BIDDING',
        config,
        options,
      );
    }

    // BAUERNSCHNAPSEN_4P (4 players, 5 cards each)
    hands[0] = DeckFactory.sortCards(deck.slice(0, 5));
    hands[1] = DeckFactory.sortCards(deck.slice(5, 10));
    hands[2] = DeckFactory.sortCards(deck.slice(10, 15));
    hands[3] = DeckFactory.sortCards(deck.slice(15, 20));
    talon = [];

    const vorhand4 = (dealerSeat + 1) % 4;
    const first3_4 = hands[vorhand4]!.slice(0, 3);
    const canRedeal4 = first3_4.filter((c) => c.rank === 5).length === 3;

    schnapsenState = {
      mode: 'BAUERNSCHNAPSEN_4P',
      schnapsenPhase: 'ATOUT_SELECTION',
      talonState: 'TALON_CLOSED',
      trumpSuit: hands[vorhand4]![0]!.suit,
      trumpCard: null,
      stockCount: 0,
      talonClosed: true,
      talonClosedBySeat: null,
      marriages: [],
      playerEyes: [0, 0, 0, 0],
      countdownScores: [24, 24, 24, 24],
      declared66Seat: null,
      kontraLevel: 1,
      targetEyes: 66,
      atoutSelection: {
        first3Cards: first3_4,
        canRedeal3Buben: canRedeal4,
        step: 'FIRST_3',
      },
      biddingHistory: [],
      consecutivePasses: 0,
      highestBidSeat: null,
      targetBummerl,
      bummerlsWon,
      allowZudrehen,
      allowTrumpfTausch,
      schneiderBummerl,
    };

    return this.buildFullState(
      matchId,
      code,
      matchName,
      totalRounds,
      chatEnabled,
      players,
      hands,
      talon,
      schnapsenState,
      dealerSeat,
      vorhand4,
      'BIDDING',
      config,
      options,
    );
  }

  private buildFullState(
    matchId: string,
    code: string,
    name: string | undefined,
    totalRounds: number,
    chatEnabled: boolean,
    players: PlayerSeatState[],
    hands: Card[][],
    talon: Card[],
    schnapsenState: SchnapsenState,
    dealerSeat: number,
    currentTurnSeat: number,
    phase: GamePhase,
    config: GameTimerConfig,
    options?: SchnapsenOptions,
  ): FullGameState {
    return {
      matchId,
      code,
      name,
      gameType: this.gameType,
      maxPlayers: this.maxPlayers,
      status: 'IN_PROGRESS',
      chatEnabled,
      chatMessages: [],
      totalRounds: Math.max(1, totalRounds),
      currentRound: 1,
      phase,
      dealerSeat,
      currentTurnSeat,
      declarerSeat: null,
      gameMode: null,
      minMode: null,
      talonTaken: false,
      players,
      hands,
      talon,
      discardedCards: [],
      biddingState: {
        phase: 'COMPLETED',
        currentBid: 0,
        holderSeat: null,
        challengerSeat: null,
        currentTurnSeat,
        passedSeats: [],
        history: [],
      },
      schnapsenState,
      schnapsenOptions: options,
      currentTrick: [],
      trickLeadSeat: currentTurnSeat,
      trickHistory: [],
      declarerCardPoints: 0,
      defenderCardPoints: 0,
      lastRoundResult: null,
      matchResult: null,
      timer: {
        config,
        turnStartedAt: Date.now(),
        turnDuration: config.turnTimeLimit,
        playerBanks: Array(this.maxPlayers).fill(config.totalTimeBank) as any,
      },
    };
  }

  public startNewRound(state: FullGameState): FullGameState {
    const deck = DeckFactory.createShuffledDeck(this.gameType);
    const hands: Card[][] = [];
    let talon: Card[] = [];

    const oldSs = state.schnapsenState;
    const mode = oldSs?.mode || this.mode;
    const targetBummerl = oldSs?.targetBummerl ?? 1;
    const bummerlsWon = oldSs?.bummerlsWon || new Array(this.maxPlayers).fill(0);
    const allowZudrehen = oldSs?.allowZudrehen ?? true;
    const allowTrumpfTausch = oldSs?.allowTrumpfTausch ?? true;
    const schneiderBummerl = oldSs?.schneiderBummerl ?? true;

    for (let i = 0; i < this.maxPlayers; i++) {
      state.players[i]!.tricksWon = 0;
      state.players[i]!.cardPointsWon = 0;
      state.players[i]!.role = 'NONE';
    }

    const dealerSeat = state.dealerSeat;
    const leadSeat = (dealerSeat + 1) % this.maxPlayers;

    if (mode === 'CLASSIC_2P') {
      const vCards = [...deck.slice(0, 3), ...deck.slice(7, 9)];
      const dCards = [...deck.slice(3, 6), ...deck.slice(9, 11)];
      hands[dealerSeat] = DeckFactory.sortCards(dCards);
      hands[leadSeat] = DeckFactory.sortCards(vCards);

      const trumpCard = deck[6]!;
      const stock = deck.slice(11);
      talon = [trumpCard, ...stock];

      state.schnapsenState = {
        mode: 'CLASSIC_2P',
        schnapsenPhase: 'TRICK_PLAY',
        talonState: 'TALON_OPEN',
        trumpSuit: trumpCard.suit,
        trumpCard,
        stockCount: 10,
        talonClosed: false,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0],
        countdownScores: state.players.map((p) => p.score),
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };
      state.phase = 'TRICK_PLAY';
    } else if (mode === 'MITSCHREIBEN_3P') {
      const p1Seat = (dealerSeat + 1) % 3;
      const p2Seat = (dealerSeat + 2) % 3;
      const p1Cards = [...deck.slice(0, 3), ...deck.slice(7, 9)];
      const p2Cards = [...deck.slice(3, 6), ...deck.slice(9, 11)];
      hands[dealerSeat] = [];
      hands[p1Seat] = DeckFactory.sortCards(p1Cards);
      hands[p2Seat] = DeckFactory.sortCards(p2Cards);

      const trumpCard = deck[6]!;
      const stock = deck.slice(11);
      talon = [trumpCard, ...stock];

      state.schnapsenState = {
        mode: 'MITSCHREIBEN_3P',
        schnapsenPhase: 'TRICK_PLAY',
        talonState: 'TALON_OPEN',
        trumpSuit: trumpCard.suit,
        trumpCard,
        stockCount: 10,
        talonClosed: false,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0, 0],
        countdownScores: state.players.map((p) => p.score),
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        pausedDealerSeat: dealerSeat,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };
      state.phase = 'TRICK_PLAY';
    } else if (mode === 'DREIERSCHNAPSEN_3P') {
      hands[0] = DeckFactory.sortCards([...deck.slice(0, 3), ...deck.slice(11, 14)]);
      hands[1] = DeckFactory.sortCards([...deck.slice(3, 6), ...deck.slice(14, 17)]);
      hands[2] = DeckFactory.sortCards([...deck.slice(6, 9), ...deck.slice(17, 20)]);
      talon = deck.slice(9, 11);

      const first3 = hands[leadSeat]!.slice(0, 3);
      const canRedeal3Buben = first3.filter((c) => c.rank === 5).length === 3;

      state.schnapsenState = {
        mode: 'DREIERSCHNAPSEN_3P',
        schnapsenPhase: 'ATOUT_SELECTION',
        talonState: 'TALON_CLOSED',
        trumpSuit: hands[leadSeat]![0]!.suit,
        trumpCard: null,
        stockCount: 2,
        talonClosed: true,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0, 0],
        countdownScores: state.players.map((p) => p.score),
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        atoutSelection: {
          first3Cards: first3,
          canRedeal3Buben,
          step: 'FIRST_3',
        },
        biddingHistory: [],
        consecutivePasses: 0,
        highestBidSeat: null,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };
      state.phase = 'BIDDING';
    } else {
      // 4P Bauernschnapsen
      hands[0] = DeckFactory.sortCards(deck.slice(0, 5));
      hands[1] = DeckFactory.sortCards(deck.slice(5, 10));
      hands[2] = DeckFactory.sortCards(deck.slice(10, 15));
      hands[3] = DeckFactory.sortCards(deck.slice(15, 20));
      talon = [];

      const first3 = hands[leadSeat]!.slice(0, 3);
      const canRedeal = first3.filter((c) => c.rank === 5).length === 3;

      state.schnapsenState = {
        mode: 'BAUERNSCHNAPSEN_4P',
        schnapsenPhase: 'ATOUT_SELECTION',
        talonState: 'TALON_CLOSED',
        trumpSuit: hands[leadSeat]![0]!.suit,
        trumpCard: null,
        stockCount: 0,
        talonClosed: true,
        talonClosedBySeat: null,
        marriages: [],
        playerEyes: [0, 0, 0, 0],
        countdownScores: state.players.map((p) => p.score),
        declared66Seat: null,
        kontraLevel: 1,
        targetEyes: 66,
        atoutSelection: {
          first3Cards: first3,
          canRedeal3Buben: canRedeal,
          step: 'FIRST_3',
        },
        biddingHistory: [],
        consecutivePasses: 0,
        highestBidSeat: null,
        targetBummerl,
        bummerlsWon,
        allowZudrehen,
        allowTrumpfTausch,
        schneiderBummerl,
      };
      state.phase = 'BIDDING';
    }

    state.hands = hands;
    state.talon = talon;
    state.discardedCards = [];
    state.currentTrick = [];
    state.trickHistory = [];
    state.currentTurnSeat = leadSeat;
    state.trickLeadSeat = leadSeat;
    state.timer.turnStartedAt = Date.now();

    return state;
  }

  public getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[] {
    const ss = state.schnapsenState;
    if (!ss) return state.hands[seatIndex] || [];
    return SchnapsenMoveValidator.getLegalCards(
      state.hands[seatIndex] || [],
      state.currentTrick,
      ss.talonState,
      ss.trumpSuit,
      ss.callType,
      ss.pendingMarriageSuit,
    );
  }

  public handleSchnapsenAction(
    state: FullGameState,
    seatIndex: number,
    payload: {
      action:
        | 'announce_marriage'
        | 'swap_trump'
        | 'close_talon'
        | 'declare_mode'
        | 'declare_66'
        | 'select_atout'
        | 'reveal_card'
        | 'redeal_3_buben'
        | 'bid'
        | 'pass'
        | 'kontra'
        | 'exchange_talon';
      suit?: Suit;
      mode?: Schnapsen3Mode;
      callType?: SchnapsenCallType;
      cardIndex?: number;
      discardIds?: string[];
    },
  ): { state: FullGameState; roundEnded: boolean } {
    const ss = state.schnapsenState;
    if (!ss) throw new Error('Kein Schnapsen-Status vorhanden.');

    const hand = state.hands[seatIndex] || [];

    // 1. Redeal 3 Buben
    if (payload.action === 'redeal_3_buben') {
      if (ss.schnapsenPhase !== 'ATOUT_SELECTION') {
        throw new Error('3-Buben-Neu-Geben ist nur in der Atout-Phase möglich.');
      }
      if (!ss.atoutSelection?.canRedeal3Buben) {
        throw new Error('Du hast keine 3 Buben in den ersten 3 Karten.');
      }
      return { state: this.startNewRound(state), roundEnded: false };
    }

    // 2. Select Atout directly
    if (payload.action === 'select_atout') {
      if (ss.schnapsenPhase !== 'ATOUT_SELECTION') {
        throw new Error('Atout kann nur in der Atout-Phase bestimmt werden.');
      }
      if (!payload.suit) throw new Error('Farbe für Atout erforderlich.');

      ss.trumpSuit = payload.suit;
      ss.schnapsenPhase = 'BIDDING';
      state.phase = 'BIDDING';

      // Vorhand automatically opens bid with default RUFER
      ss.callType = 'RUFER';
      ss.highestBidSeat = seatIndex;
      ss.consecutivePasses = 0;
      ss.biddingHistory = [{ seatIndex, callType: 'RUFER' }];
      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    // 3. Reveal Card (Aufschlagen) for Atout
    if (payload.action === 'reveal_card') {
      if (ss.schnapsenPhase !== 'ATOUT_SELECTION') {
        throw new Error('Karte aufdecken ist nur in der Atout-Phase möglich.');
      }
      const cIdx = payload.cardIndex ?? 3;
      const card = hand[cIdx];
      if (!card) throw new Error('Ungültiger Kartenindex für Atout-Aufschlag.');

      ss.trumpSuit = card.suit;
      if (ss.atoutSelection) ss.atoutSelection.cardRevealed = card;
      ss.schnapsenPhase = 'BIDDING';
      state.phase = 'BIDDING';

      // Vorhand automatically opens bid with default RUFER
      ss.callType = 'RUFER';
      ss.highestBidSeat = seatIndex;
      ss.consecutivePasses = 0;
      ss.biddingHistory = [{ seatIndex, callType: 'RUFER' }];
      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    // 4. Bid Contract (Lizitation)
    if (payload.action === 'bid') {
      if (ss.schnapsenPhase !== 'BIDDING' || state.currentTurnSeat !== seatIndex) {
        throw new Error('Bieten ist aktuell nicht erlaubt.');
      }
      if (!payload.callType) throw new Error('Spielform (callType) erforderlich.');

      const newCall = payload.callType;
      const config = SCHNAPSEN_CALL_CONFIG[newCall];

      // 3P restrictions
      if (this.mode === 'DREIERSCHNAPSEN_3P' && !config.allowedFor3P) {
        throw new Error(`${config.name} existiert nicht im Dreierschnapsen.`);
      }

      // Check current highest bid strength
      const currentCall = ss.callType;
      const currentPoints = currentCall ? SCHNAPSEN_CALL_CONFIG[currentCall].points : 0;
      if (config.points < currentPoints) {
        throw new Error(`Gebot muss höher als ${currentPoints} Punkte sein.`);
      }

      // Check specific contract conditions
      if (newCall === 'ASSBETTLER') {
        const aceCount = hand.filter((c) => c.rank === 9).length;
        if (aceCount !== 1) {
          throw new Error('Für einen Assbettler musst du genau 1 Ass halten.');
        }
      }

      const vorhandSeat = (state.dealerSeat + 1) % this.maxPlayers;
      const isVorhandTeam = seatIndex % 2 === vorhandSeat % 2;

      if (newCall === 'SCHNAPSER' || newCall === 'BAUERNSCHNAPSER') {
        if (!isVorhandTeam) {
          throw new Error('Schnapser und Bauernschnapser können nur vom Vorhand-Team angesagt werden.');
        }
      }

      if (newCall === 'KONTRASCHNAPSER' || newCall === 'KONTRABAUERNSCHNAPSER') {
        if (isVorhandTeam) {
          throw new Error('Kontraschnapser kann nur von der Gegenpartei angesagt werden.');
        }
      }

      if (newCall === 'HERRENGANGL') {
        if (seatIndex === vorhandSeat) {
          throw new Error('Herrengangl kann nicht von Vorhand angesagt werden.');
        }
        // Must hold 5 cards of single non-atout suit
        const nonAtoutSuits: Suit[] = (['HERZ', 'SCHELL', 'LAUB', 'EICHEL'] as Suit[]).filter(
          (s) => s !== ss.trumpSuit,
        );
        const has5Same = nonAtoutSuits.some(
          (s) => hand.filter((c) => c.suit === s).length === 5,
        );
        if (!has5Same) {
          throw new Error('Herrengangl erfordert alle 5 Karten einer Nicht-Atout-Farbe.');
        }
      }

      if (newCall === 'HERRENSCHNAPSER') {
        if (seatIndex !== vorhandSeat) {
          throw new Error('Herrenschnapser kann nur von Vorhand angesagt werden.');
        }
        const trumpCount = hand.filter((c) => c.suit === ss.trumpSuit).length;
        if (trumpCount !== 5) {
          throw new Error('Herrenschnapser erfordert alle 5 Karten der Atout-Farbe.');
        }
      }

      // Check immediate win for Aufgelegt games (Herrengangl: 18 P, Herrenschnapser: 24 P)
      if (config.isAufgelegt) {
        ss.callType = newCall;
        ss.highestBidSeat = seatIndex;
        state.declarerSeat = seatIndex;
        const finalized = this.finalizeSchnapsenRound(
          state,
          seatIndex,
          `${state.players[seatIndex]?.username} gewinnt aufgelegt mit ${config.name} (${config.points} Punkte)!`,
          config.points,
        );
        return { state: finalized, roundEnded: true };
      }

      ss.callType = newCall;
      ss.highestBidSeat = seatIndex;
      ss.consecutivePasses = 0;
      ss.biddingHistory?.push({ seatIndex, callType: newCall });

      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    // 5. Pass ("Gut")
    if (payload.action === 'pass') {
      if (ss.schnapsenPhase !== 'BIDDING' || state.currentTurnSeat !== seatIndex) {
        throw new Error('Passen ist aktuell nicht an der Reihe.');
      }

      ss.consecutivePasses = (ss.consecutivePasses ?? 0) + 1;
      ss.biddingHistory?.push({ seatIndex, callType: 'PASS' });

      // Bidding ends when maxPlayers - 1 players consecutively pass
      if (ss.consecutivePasses >= this.maxPlayers - 1) {
        return this.finishBidding(state);
      }

      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    // 6. Kontra ("Spritzen")
    if (payload.action === 'kontra') {
      if (ss.schnapsenPhase !== 'BIDDING' || state.currentTurnSeat !== seatIndex) {
        throw new Error('Kontra ist aktuell nicht erlaubt.');
      }
      const call = ss.callType;
      if (!call || !SCHNAPSEN_CALL_CONFIG[call].canBeKontriert) {
        throw new Error('Dieses Spiel kann nicht kontriert werden.');
      }

      const declarerSeat = ss.highestBidSeat ?? 0;
      if (this.mode === 'BAUERNSCHNAPSEN_4P') {
        const declarerTeam = declarerSeat % 2;
        const currentTeam = seatIndex % 2;
        if (declarerTeam === currentTeam && ss.kontraLevel === 1) {
          throw new Error('Eigenen Partner zu spritzen ist nicht erlaubt.');
        }
      }

      if (ss.kontraLevel >= 8) {
        throw new Error('Maximaler Multiplikator (8x Nochmals) erreicht.');
      }

      ss.kontraLevel = (ss.kontraLevel * 2) as SchnapsenKontraLevel;
      ss.kontraSeat = seatIndex;
      ss.consecutivePasses = 0;
      ss.biddingHistory?.push({ seatIndex, callType: 'KONTRA' });

      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    // 7. Talon Exchange (Dreierschnapsen)
    if (payload.action === 'exchange_talon') {
      if (ss.schnapsenPhase !== 'TALON_EXCHANGE' || state.currentTurnSeat !== seatIndex) {
        throw new Error('Talon-Tausch ist jetzt nicht möglich.');
      }
      if (!payload.discardIds || payload.discardIds.length !== 2) {
        throw new Error('Es müssen genau 2 Karten abgelegt werden.');
      }

      const discardSet = new Set(payload.discardIds);
      const remainingHand = hand.filter((c) => !discardSet.has(c.id));
      const discarded = hand.filter((c) => discardSet.has(c.id));

      if (discarded.length !== 2 || remainingHand.length !== 6) {
        throw new Error('Ungültige Karten zum Ablegen gewählt.');
      }

      state.hands[seatIndex] = DeckFactory.sortCards(remainingHand, ss.trumpSuit);
      state.discardedCards = discarded;

      // Transition to TRICK_PLAY
      ss.schnapsenPhase = 'TRICK_PLAY';
      state.phase = 'TRICK_PLAY';

      const call = ss.callType || 'RUFER';
      const callCfg = SCHNAPSEN_CALL_CONFIG[call];
      const vorhand = (state.dealerSeat + 1) % this.maxPlayers;
      const leadSeat = callCfg.leadByVorhand ? vorhand : seatIndex;

      state.currentTurnSeat = leadSeat;
      state.trickLeadSeat = leadSeat;
      return { state, roundEnded: false };
    }

    // 8. Swap Atout Jack (Unter/Bube rank 5 of trumpSuit)
    if (payload.action === 'swap_trump') {
      if (ss.allowTrumpfTausch === false) {
        throw new Error('Der Trumpftausch mit dem Buben ist in diesem Spiel deaktiviert.');
      }
      if (
        ss.talonState !== 'TALON_OPEN' ||
        ss.talonClosed ||
        !ss.trumpCard ||
        state.talon.length <= 1
      ) {
        throw new Error('Trumpf kann jetzt nicht mehr getauscht werden.');
      }
      const trumpJackIdx = hand.findIndex(
        (c) => c.suit === ss.trumpSuit && c.rank === 5,
      );
      if (trumpJackIdx === -1) {
        throw new Error('Du benötigst den Atout-Buben, um die offene Trumpfkarte zu tauschen.');
      }
      const [oldJack] = hand.splice(trumpJackIdx, 1);
      hand.push(ss.trumpCard);
      state.hands[seatIndex] = DeckFactory.sortCards(hand, ss.trumpSuit);
      ss.trumpCard = oldJack!;
      state.talon[0] = oldJack!;
      return { state, roundEnded: false };
    }

    // 9. Close Talon (Zudrehen)
    if (payload.action === 'close_talon') {
      if (ss.allowZudrehen === false) {
        throw new Error('Das Zudrehen ist in diesem Spiel deaktiviert.');
      }
      if (
        ss.talonState !== 'TALON_OPEN' ||
        ss.talonClosed ||
        state.trickHistory.length < 1 ||
        state.talon.length <= 2
      ) {
        throw new Error('Talon kann jetzt nicht zugedreht werden.');
      }

      ss.talonClosed = true;
      ss.talonClosedBySeat = seatIndex;
      ss.talonState = 'TALON_CLOSED';

      // Save opponent eyes & tricks at moment of closing (for Wienerisch / Finster scoring)
      const opponentSeat = this.getActiveOpponentSeat(state, seatIndex);
      ss.talonClosedOpponentEyes = ss.playerEyes[opponentSeat] || 0;
      ss.talonClosedOpponentTricks = state.players[opponentSeat]?.tricksWon || 0;

      return { state, roundEnded: false };
    }

    // 10. Announce Marriage (20 / 40)
    if (payload.action === 'announce_marriage') {
      if (!payload.suit) throw new Error('Farbe für Ansage erforderlich.');
      const hasKing = hand.some((c) => c.suit === payload.suit && c.rank === 7);
      const hasOber = hand.some((c) => c.suit === payload.suit && c.rank === 6);
      if (!hasKing || !hasOber) {
        throw new Error(`Du hast nicht König und Dame in ${payload.suit}.`);
      }

      const points = payload.suit === ss.trumpSuit ? 40 : 20;
      ss.marriages.push({ seatIndex, suit: payload.suit, points });
      ss.pendingMarriageSuit = payload.suit;

      // Special rule: Marriage points count if player has made or makes at least one trick
      const playerTricks = state.players[seatIndex]?.tricksWon || 0;
      if (playerTricks === 0) {
        // Pending until player wins a trick
        ss.firstTrickVorhandMarriageSuit = payload.suit;
        ss.firstTrickVorhandMarriageSeat = seatIndex;
      } else {
        ss.playerEyes[seatIndex] += points;
        state.players[seatIndex]!.cardPointsWon += points;
      }

      // If player reaches >= 66 immediately through marriage
      if (ss.playerEyes[seatIndex] >= 66 && (state.players[seatIndex]!.tricksWon > 0)) {
        const finalized = this.finalizeSchnapsenRound(
          state,
          seatIndex,
          `${state.players[seatIndex]?.username} hat ${points} angesagt und erreicht 66 Augen!`,
          this.calculateNormalPoints(state, seatIndex),
        );
        return { state: finalized, roundEnded: true };
      }

      return { state, roundEnded: false };
    }

    // 11. Claim 66 ("Danke genug")
    if (payload.action === 'declare_66') {
      const eyes = ss.playerEyes[seatIndex] || 0;
      const tricksWon = state.players[seatIndex]?.tricksWon || 0;
      // You must have at least 66 eyes AND at least 1 trick won!
      if (eyes >= 66 && tricksWon > 0) {
        // Player actually has >= 66 and >= 1 trick -> Wins!
        const pointsWon = ss.talonClosedBySeat !== null
          ? this.calculateZudrehenPoints(state, seatIndex, true)
          : this.calculateNormalPoints(state, seatIndex);

        const finalized = this.finalizeSchnapsenRound(
          state,
          seatIndex,
          `${state.players[seatIndex]?.username} sagt „Danke genug“ mit ${eyes} Augen!`,
          pointsWon,
        );
        return { state: finalized, roundEnded: true };
      } else {
        // Irrtum! Caller loses immediately.
        const opponentSeat = this.getActiveOpponentSeat(state, seatIndex);
        const pointsLost = ss.talonClosedBySeat !== null
          ? this.calculateZudrehenPoints(state, seatIndex, false)
          : this.calculateNormalPoints(state, opponentSeat);

        const finalized = this.finalizeSchnapsenRound(
          state,
          opponentSeat,
          `${state.players[seatIndex]?.username} hat irrtümlich 66 beansprucht (${eyes} Augen, ${tricksWon} Stiche). Gegner gewinnt!`,
          pointsLost,
        );
        return { state: finalized, roundEnded: true };
      }
    }

    return { state, roundEnded: false };
  }

  private finishBidding(state: FullGameState): { state: FullGameState; roundEnded: boolean } {
    const ss = state.schnapsenState!;
    const declarer = ss.highestBidSeat ?? (state.dealerSeat + 1) % this.maxPlayers;
    state.declarerSeat = declarer;
    const call = ss.callType || 'RUFER';
    const config = SCHNAPSEN_CALL_CONFIG[call];

    // Set roles
    for (let i = 0; i < this.maxPlayers; i++) {
      if (this.mode === 'BAUERNSCHNAPSEN_4P') {
        state.players[i]!.role = i % 2 === declarer % 2 ? 'DECLARER' : 'DEFENDER';
      } else {
        state.players[i]!.role = i === declarer ? 'DECLARER' : 'DEFENDER';
      }
    }

    // In 3P Dreierschnapsen:
    if (this.mode === 'DREIERSCHNAPSEN_3P') {
      if (call === 'BETTLER' || call === 'ASSBETTLER') {
        // Negative game: talon remains untouched!
        ss.schnapsenPhase = 'TRICK_PLAY';
        state.phase = 'TRICK_PLAY';
        state.currentTurnSeat = declarer;
        state.trickLeadSeat = declarer;
        return { state, roundEnded: false };
      } else {
        // Declarer picks up talon (6 + 2 = 8 cards)
        state.hands[declarer]!.push(...state.talon);
        state.talon = [];
        ss.schnapsenPhase = 'TALON_EXCHANGE';
        state.phase = 'TALON_AND_DECLARATION';
        state.currentTurnSeat = declarer;
        return { state, roundEnded: false };
      }
    }

    // In 4P Bauernschnapsen:
    if (this.mode === 'BAUERNSCHNAPSEN_4P') {
      if (call === 'BETTLER' || call === 'ASSBETTLER') {
        // Partner of declarer sits out!
        const partnerSeat = (declarer + 2) % 4;
        state.hands[partnerSeat] = [];
      }
    }

    ss.schnapsenPhase = 'TRICK_PLAY';
    state.phase = 'TRICK_PLAY';
    const vorhand = (state.dealerSeat + 1) % this.maxPlayers;
    const leadSeat = config.leadByVorhand ? vorhand : declarer;

    state.currentTurnSeat = leadSeat;
    state.trickLeadSeat = leadSeat;
    return { state, roundEnded: false };
  }

  public handlePlayCard(
    state: FullGameState,
    seatIndex: number,
    cardId: string,
  ): TrickPlayResult {
    const ss = state.schnapsenState;
    if (!ss) throw new Error('Kein Schnapsen-Status vorhanden.');
    if (state.currentTurnSeat !== seatIndex) {
      throw new Error('Du bist nicht am Zug.');
    }

    const hand = state.hands[seatIndex] || [];
    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) throw new Error('Karte nicht in der Hand.');
    const card = hand[cardIdx]!;

    // Validate legal card
    const legalCards = this.getLegalCardsToPlay(state, seatIndex);
    if (!legalCards.some((c) => c.id === cardId)) {
      throw new Error(`Die Karte ${card.name} ist nicht regelkonform spielbar.`);
    }

    // Play card
    hand.splice(cardIdx, 1);
    state.currentTrick.push({ seatIndex, card });
    ss.pendingMarriageSuit = null; // marriage card has been played

    // Check if trick is incomplete
    const requiredPlayersInTrick =
      this.mode === 'CLASSIC_2P'
        ? 2
        : this.mode === 'MITSCHREIBEN_3P'
        ? 2
        : (ss.callType === 'BETTLER' || ss.callType === 'ASSBETTLER') && this.mode === 'BAUERNSCHNAPSEN_4P'
        ? 3
        : this.maxPlayers;

    if (state.currentTrick.length < requiredPlayersInTrick) {
      // Advance to next active seat
      let nextSeat = (seatIndex + 1) % this.maxPlayers;
      if (this.mode === 'MITSCHREIBEN_3P' && nextSeat === ss.pausedDealerSeat) {
        nextSeat = (nextSeat + 1) % this.maxPlayers;
      }
      if (
        this.mode === 'BAUERNSCHNAPSEN_4P' &&
        (ss.callType === 'BETTLER' || ss.callType === 'ASSBETTLER') &&
        nextSeat === (state.declarerSeat! + 2) % 4
      ) {
        nextSeat = (nextSeat + 1) % this.maxPlayers;
      }

      state.currentTurnSeat = nextSeat;
      state.timer.turnStartedAt = Date.now();
      return { state, trickCompleted: false, roundEnded: false };
    }

    // Trick is complete! Determine winner
    const isZehnerloch = ss.callType === 'ZEHNERLOCH';
    const effectiveTrump =
      ss.callType && !SCHNAPSEN_CALL_CONFIG[ss.callType].hasTrump ? null : ss.trumpSuit;

    const winningPlayed = SchnapsenMoveValidator.getWinningCard(
      state.currentTrick,
      effectiveTrump,
      isZehnerloch,
    )!;
    const winnerSeat = winningPlayed.seatIndex;

    // Award trick & card points
    const trickPoints = state.currentTrick.reduce((acc, pc) => acc + pc.card.points, 0);
    ss.playerEyes[winnerSeat] += trickPoints;
    state.players[winnerSeat]!.cardPointsWon += trickPoints;
    state.players[winnerSeat]!.tricksWon += 1;

    // If Vorhand announced marriage in trick 1 and just won a trick, award marriage points
    if (
      ss.firstTrickVorhandMarriageSuit &&
      ss.firstTrickVorhandMarriageSeat === winnerSeat
    ) {
      const marriagePts =
        ss.firstTrickVorhandMarriageSuit === ss.trumpSuit ? 40 : 20;
      ss.playerEyes[winnerSeat] += marriagePts;
      state.players[winnerSeat]!.cardPointsWon += marriagePts;
      ss.firstTrickVorhandMarriageSuit = null; // awarded!
    }

    // Record trick in history
    const trick: Trick = {
      trickNumber: state.trickHistory.length + 1,
      leadSeat: state.trickLeadSeat,
      winnerSeat,
      cards: [...state.currentTrick],
      points: trickPoints,
    };
    state.trickHistory.push(trick);

    // In 2P / Mitschreiben: Nachziehen from talon if TALON_OPEN
    if (
      (this.mode === 'CLASSIC_2P' || this.mode === 'MITSCHREIBEN_3P') &&
      ss.talonState === 'TALON_OPEN'
    ) {
      const loserSeat = state.currentTrick.find((pc) => pc.seatIndex !== winnerSeat)!.seatIndex;
      if (state.talon.length >= 2) {
        const winDraw = state.talon.pop()!;
        const loseDraw = state.talon.pop()!;
        state.hands[winnerSeat]!.push(winDraw);
        state.hands[loserSeat]!.push(loseDraw);
        state.hands[winnerSeat] = DeckFactory.sortCards(state.hands[winnerSeat]!, ss.trumpSuit);
        state.hands[loserSeat] = DeckFactory.sortCards(state.hands[loserSeat]!, ss.trumpSuit);
        ss.stockCount = state.talon.length;
        if (state.talon.length === 0) {
          ss.talonState = 'TALON_CLOSED';
        }
      }
    }

    state.currentTurnSeat = winnerSeat;
    state.trickLeadSeat = winnerSeat;
    state.timer.turnStartedAt = Date.now();

    // Check game contracts & conditions
    const call = ss.callType;
    const declarer = state.declarerSeat ?? 0;

    // 1. Schnapser (Drei-Stich) / Kontraschnapser:
    if (call === 'SCHNAPSER' || call === 'KONTRASCHNAPSER') {
      const basePts = SCHNAPSEN_CALL_CONFIG[call].points * ss.kontraLevel;
      if (winnerSeat !== declarer) {
        // Opponent took a trick -> Declarer loses!
        const oppTeamLeader = (declarer + 1) % this.maxPlayers;
        const finalized = this.finalizeSchnapsenRound(
          state,
          oppTeamLeader,
          `${state.players[declarer]?.username} hat ${call} verloren (Stich abgegeben)!`,
          basePts,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }
      if (state.players[declarer]!.tricksWon === 3) {
        if (ss.playerEyes[declarer] >= 66) {
          // Declarer reached 66 within 3 tricks -> Wins!
          const finalized = this.finalizeSchnapsenRound(
            state,
            declarer,
            `${state.players[declarer]?.username} gewinnt ${call} mit ${ss.playerEyes[declarer]} Augen!`,
            basePts,
          );
          return { state: finalized, trickCompleted: true, roundEnded: true };
        } else {
          // 3 tricks completed but < 66 eyes -> Declarer loses!
          const oppTeamLeader = (declarer + 1) % this.maxPlayers;
          const finalized = this.finalizeSchnapsenRound(
            state,
            oppTeamLeader,
            `${state.players[declarer]?.username} hat ${call} verloren (< 66 Augen nach 3 Stichen)!`,
            basePts,
          );
          return { state: finalized, trickCompleted: true, roundEnded: true };
        }
      }
    }

    // 2. Bettler / Assbettler:
    if (call === 'BETTLER' || call === 'ASSBETTLER') {
      const basePts = SCHNAPSEN_CALL_CONFIG[call].points * ss.kontraLevel;
      if (winnerSeat === declarer) {
        // Declarer took a trick -> Loses immediately!
        const oppTeamLeader = (declarer + 1) % this.maxPlayers;
        const finalized = this.finalizeSchnapsenRound(
          state,
          oppTeamLeader,
          `${state.players[declarer]?.username} hat einen Stich gemacht und ${call} verloren!`,
          basePts,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }
    }

    // 3. Durchmarsch / Zehnerloch / Bauernschnapser / Kontrabauernschnapser:
    if (
      call === 'GANGL' ||
      call === 'ZEHNERLOCH' ||
      call === 'BAUERNSCHNAPSER' ||
      call === 'KONTRABAUERNSCHNAPSER'
    ) {
      const basePts = SCHNAPSEN_CALL_CONFIG[call].points * ss.kontraLevel;
      if (winnerSeat !== declarer) {
        // Anyone else took a trick -> Declarer loses!
        const oppTeamLeader = (declarer + 1) % this.maxPlayers;
        const finalized = this.finalizeSchnapsenRound(
          state,
          oppTeamLeader,
          `${state.players[declarer]?.username} hat ${call} verloren (Stich abgegeben)!`,
          basePts,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }
    }

    // Check if all cards have been played (all hands empty)
    const allHandsEmpty = state.hands.every((h) => h.length === 0);
    if (allHandsEmpty) {
      if (call === 'BETTLER' || call === 'ASSBETTLER') {
        const basePts = SCHNAPSEN_CALL_CONFIG[call].points * ss.kontraLevel;
        const finalized = this.finalizeSchnapsenRound(
          state,
          declarer,
          `${state.players[declarer]?.username} hat alle Stiche vermieden und ${call} gewonnen!`,
          basePts,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }

      if (
        call === 'GANGL' ||
        call === 'ZEHNERLOCH' ||
        call === 'BAUERNSCHNAPSER' ||
        call === 'KONTRABAUERNSCHNAPSER'
      ) {
        const basePts = SCHNAPSEN_CALL_CONFIG[call].points * ss.kontraLevel;
        const finalized = this.finalizeSchnapsenRound(
          state,
          declarer,
          `${state.players[declarer]?.username} hat alle Stiche gewonnen und ${call} erfüllt!`,
          basePts,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }

      // Normal play / Rufer played to the end:
      if (ss.talonClosedBySeat !== null) {
        // Closer failed to reach 66 eyes -> Closer loses!
        const closer = ss.talonClosedBySeat;
        const opponentSeat = this.getActiveOpponentSeat(state, closer);
        const pointsLost = this.calculateZudrehenPoints(state, closer, false);
        const finalized = this.finalizeSchnapsenRound(
          state,
          opponentSeat,
          `${state.players[closer]?.username} hat nach dem Zudrehen keine 66 Augen erreicht und verliert!`,
          pointsLost,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      } else {
        // Natural exhaustion: Winner of last trick wins!
        const pointsWon = this.calculateNormalPoints(state, winnerSeat);
        const finalized = this.finalizeSchnapsenRound(
          state,
          winnerSeat,
          `${state.players[winnerSeat]?.username} gewinnt den letzten Stich!`,
          pointsWon,
        );
        return { state: finalized, trickCompleted: true, roundEnded: true };
      }
    }

    return { state, trickCompleted: true, roundEnded: false };
  }

  /**
   * Helper: Resolves the active opponent for a given seat.
   * Handles CLASSIC_2P, MITSCHREIBEN_3P (excluding pausedDealerSeat),
   * BAUERNSCHNAPSEN_4P (opposing team leader), and DREIERSCHNAPSEN_3P.
   */
  public getActiveOpponentSeat(state: FullGameState, seatIndex: number): number {
    const ss = state.schnapsenState;
    const mode = ss?.mode || this.mode;

    if (mode === 'CLASSIC_2P') {
      return 1 - seatIndex;
    }

    if (mode === 'MITSCHREIBEN_3P') {
      const pausedSeat = ss?.pausedDealerSeat ?? state.dealerSeat;
      const activeSeats = [0, 1, 2].filter((s) => s !== seatIndex && s !== pausedSeat);
      return activeSeats[0] ?? (seatIndex + 1) % 3;
    }

    if (mode === 'BAUERNSCHNAPSEN_4P') {
      const oppTeam = 1 - (seatIndex % 2);
      return oppTeam;
    }

    // DREIERSCHNAPSEN_3P
    const declarer = state.declarerSeat ?? 0;
    if (seatIndex === declarer) {
      return (declarer + 1) % 3;
    }
    return declarer;
  }

  public calculateNormalPoints(state: FullGameState, winnerSeat: number): number {
    const ss = state.schnapsenState;
    if (!ss) return 1;

    let opponentTricks = 0;
    let opponentEyes = 0;

    if (this.mode === 'CLASSIC_2P') {
      const loserSeat = 1 - winnerSeat;
      opponentTricks = state.players[loserSeat]?.tricksWon || 0;
      opponentEyes = ss.playerEyes[loserSeat] || 0;
    } else if (this.mode === 'MITSCHREIBEN_3P') {
      const loserSeat = this.getActiveOpponentSeat(state, winnerSeat);
      opponentTricks = state.players[loserSeat]?.tricksWon || 0;
      opponentEyes = ss.playerEyes[loserSeat] || 0;
    } else if (this.mode === 'BAUERNSCHNAPSEN_4P') {
      const oppTeam = 1 - (winnerSeat % 2);
      opponentTricks =
        state.players.filter((p) => p.seatIndex % 2 === oppTeam).reduce((a, b) => a + b.tricksWon, 0);
      opponentEyes =
        ss.playerEyes.filter((_, idx) => idx % 2 === oppTeam).reduce((a, b) => a + b, 0);
    } else {
      // 3P Dreierschnapsen
      const oppSeats = [0, 1, 2].filter((s) => s !== winnerSeat);
      opponentTricks = oppSeats.reduce((acc, s) => acc + (state.players[s]?.tricksWon || 0), 0);
      opponentEyes = oppSeats.reduce((acc, s) => acc + (ss.playerEyes[s] || 0), 0);
    }

    let pts = 1;
    if (opponentTricks === 0) {
      pts = 3;
    } else if (opponentEyes < 33) {
      pts = 2;
    } else {
      pts = 1;
    }

    const kontra = ss.kontraLevel || 1;
    return pts * kontra;
  }

  public calculateZudrehenPoints(
    state: FullGameState,
    closerSeat: number,
    closerWon: boolean,
  ): number {
    const ss = state.schnapsenState;
    const oppEyesAtClosing = ss?.talonClosedOpponentEyes ?? 0;
    const oppTricksAtClosing = ss?.talonClosedOpponentTricks ?? 0;

    if (closerWon) {
      if (oppTricksAtClosing === 0) return 3;
      if (oppEyesAtClosing < 33) return 2;
      return 1;
    } else {
      // Closer lost! Opponent gets 3 points if trickless at closing, else 2.
      if (oppTricksAtClosing === 0) return 3;
      return 2;
    }
  }

  public finalizeSchnapsenRound(
    state: FullGameState,
    winningSeat: number,
    reason: string,
    pointsWon: number,
  ): FullGameState {
    state.phase = 'ROUND_SUMMARY';
    const ss = state.schnapsenState;
    const mode = ss?.mode || this.mode;
    const initialScore = mode === 'CLASSIC_2P' || mode === 'MITSCHREIBEN_3P' ? 7 : 24;

    // Apply countdown subtraction
    if (mode === 'CLASSIC_2P') {
      state.players[winningSeat]!.score = Math.max(0, state.players[winningSeat]!.score - pointsWon);
    } else if (mode === 'MITSCHREIBEN_3P') {
      state.players[winningSeat]!.score = Math.max(0, state.players[winningSeat]!.score - pointsWon);
      const pausedSeat = ss?.pausedDealerSeat ?? state.dealerSeat;
      state.players[pausedSeat]!.score = Math.max(0, state.players[pausedSeat]!.score - pointsWon);
    } else if (mode === 'BAUERNSCHNAPSEN_4P') {
      const winningTeam = winningSeat % 2;
      for (let i = 0; i < 4; i++) {
        if (i % 2 === winningTeam) {
          state.players[i]!.score = Math.max(0, state.players[i]!.score - pointsWon);
        }
      }
    } else if (mode === 'DREIERSCHNAPSEN_3P') {
      const declarer = state.declarerSeat ?? 0;
      if (winningSeat === declarer) {
        state.players[declarer]!.score = Math.max(0, state.players[declarer]!.score - pointsWon);
      } else {
        // Declarer lost: BOTH OPPONENTS SUBTRACT FULL POINTS EACH!
        for (let i = 0; i < 3; i++) {
          if (i !== declarer) {
            state.players[i]!.score = Math.max(0, state.players[i]!.score - pointsWon);
          }
        }
      }
    }

    // Check for match completion
    const targetZeroReached = state.players.some((p) => p.score <= 0);
    const roundResult: RoundResult = {
      roundNumber: state.currentRound,
      dealerSeat: state.dealerSeat,
      declarerSeat: winningSeat,
      gameMode: 0 as any,
      declarerWon: true,
      declarerCardPoints: ss?.playerEyes[winningSeat] || 0,
      defenderCardPoints: 0,
      scoreDeltaDeclarer: pointsWon,
      scoreDeltaDefenders: 0,
      scoresAfterRound: state.players.map((p) => ({
        seatIndex: p.seatIndex,
        score: p.score,
      })),
      reason,
    };
    state.lastRoundResult = roundResult;

    if (targetZeroReached) {
      const sorted = [...state.players].sort((a, b) => a.score - b.score);
      const winner = sorted[0]!;
      const isSchneider =
        (ss?.schneiderBummerl !== false) &&
        state.players.some((p) => p.seatIndex !== winner.seatIndex && p.score === initialScore);
      const bummerlCount = isSchneider ? 2 : 1;

      if (!ss?.bummerlsWon) {
        if (ss) ss.bummerlsWon = new Array(this.maxPlayers).fill(0);
      }

      if (mode === 'BAUERNSCHNAPSEN_4P') {
        const winningTeam = winningSeat % 2;
        for (let i = 0; i < 4; i++) {
          if (i % 2 === winningTeam && ss?.bummerlsWon) {
            ss.bummerlsWon[i] = (ss.bummerlsWon[i] || 0) + bummerlCount;
          }
        }
      } else if (ss?.bummerlsWon) {
        ss.bummerlsWon[winningSeat] = (ss.bummerlsWon[winningSeat] || 0) + bummerlCount;
      }

      const targetBummerl = ss?.targetBummerl ?? 1;
      const matchWon = ss?.bummerlsWon ? ss.bummerlsWon.some((b) => b >= targetBummerl) : true;

      if (matchWon || state.currentRound >= state.totalRounds) {
        state.phase = 'MATCH_COMPLETED';
        state.status = 'COMPLETED';
        state.matchResult = this.computeMatchResult(state);
      } else {
        // Next Bummerl: reset countdown scores back to initialScore for all players
        for (const p of state.players) {
          p.score = initialScore;
        }
        roundResult.reason += ` | Bummerl an ${state.players[winningSeat]?.username} (${bummerlCount} Bummerl${isSchneider ? ' - Schneider!' : ''}). Stand: ${ss?.bummerlsWon ? ss.bummerlsWon[winningSeat] : bummerlCount}/${targetBummerl}`;
      }
    }

    return state;
  }

  public clearCurrentTrick(state: FullGameState): FullGameState {
    state.currentTrick = [];
    return state;
  }

  public handleSurrender(
    state: FullGameState,
    seatIndex: number,
    surrenderType?: 'round' | 'match',
  ): FullGameState {
    const oppSeat = this.getActiveOpponentSeat(state, seatIndex);
    if (surrenderType === 'match') {
      state.players[oppSeat]!.score = 0;
      state.phase = 'MATCH_COMPLETED';
      state.status = 'COMPLETED';
      state.matchResult = this.computeMatchResult(state);
      return state;
    }

    return this.finalizeSchnapsenRound(
      state,
      oppSeat,
      `${state.players[seatIndex]?.username} hat aufgegeben.`,
      2,
    );
  }

  public advanceToNextRound(state: FullGameState): FullGameState {
    state.currentRound += 1;
    state.dealerSeat = (state.dealerSeat + 1) % this.maxPlayers;
    state.lastRoundResult = null;
    return this.startNewRound(state);
  }

  public computeMatchResult(state: FullGameState): MatchResult {
    const ss = state.schnapsenState;
    const mode = ss?.mode || this.mode;
    const initialScore = mode === 'CLASSIC_2P' || mode === 'MITSCHREIBEN_3P' ? 7 : 24;

    const sorted = [...state.players].sort((a, b) => a.score - b.score);
    const winner = sorted[0]!;
    const isSchneider =
      (ss?.schneiderBummerl !== false) &&
      state.players.some((p) => p.seatIndex !== winner.seatIndex && p.score === initialScore);
    const bummerlCount = isSchneider ? 2 : 1;

    return {
      matchId: state.matchId,
      totalRounds: state.currentRound,
      isSchneider,
      bummerlCount,
      rankings: sorted.map((p, idx) => {
        const eloDelta = idx === 0 ? 16 : idx === sorted.length - 1 ? -16 : 0;
        return {
          rank: idx + 1,
          seatIndex: p.seatIndex,
          userId: p.userId,
          username: p.username,
          isBot: p.isBot,
          finalScore: p.score,
          eloBefore: 1000,
          eloDelta,
          eloAfter: 1000 + eloDelta,
        };
      }),
    };
  }
}
