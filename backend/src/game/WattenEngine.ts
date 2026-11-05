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
  Suit,
  Trick,
  WattenGameMode,
  WattenOptions,
  WattenState,
} from '@spielfranzen/shared';
import { DeckFactory } from './DeckFactory.js';
import { IGameEngine, TrickPlayResult } from './IGameEngine.js';

export class WattenEngine implements IGameEngine {
  public readonly gameType: GameType;
  private readonly maxPlayers: number;

  constructor(gameType: 'watten_2' | 'watten_4') {
    this.gameType = gameType;
    this.maxPlayers = gameType === 'watten_2' ? 2 : 4;
  }

  public createInitialState(
    matchId: string,
    code: string,
    totalRounds: number,
    playersData: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: GameTimerConfig,
    chatEnabled: boolean = true,
    matchName?: string,
    options?: WattenOptions,
  ): FullGameState {
    const config = timerConfig ?? {
      enabled: true,
      turnTimeLimit: 60,
      totalTimeBank: 300,
    };

    const players: PlayerSeatState[] = playersData.slice(0, this.maxPlayers).map((p, idx) => ({
      seatIndex: idx,
      userId: p.userId,
      username: p.username,
      isBot: p.isBot,
      isOnline: true,
      score: 0,
      role: 'NONE',
      tricksWon: 0,
      cardPointsWon: 0,
    }));

    // Deal 5 cards each from 33-card Bavarian deck
    const deck = DeckFactory.createShuffledDeck(this.gameType);
    const hands: Card[][] = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      hands.push(DeckFactory.sortCards(deck.slice(i * 5, (i + 1) * 5)));
    }

    const dealerSeat = 0;
    // Vorhand (links vom Geber) sagt Schlag an
    const schlagChooser = (dealerSeat + 1) % this.maxPlayers;
    // Geber sagt Farbe an
    const farbeChooser = dealerSeat;
    // Spieler rechts vom Geber hebt ab (sieht unterste Karte)
    const cutCard = deck[deck.length - 1] || null;

    const targetScore = options?.targetScore || 15;
    const hasGueter = options?.hasGueter !== false;
    const hasSupergueter = options?.hasSupergueter === true;
    const weliRole = options?.weliRole || 'kleinster_trumpf';

    const isGestrichen: [boolean, boolean] = [false, false];

    const wattenState: WattenState = {
      schlag: null,
      farbe: null,
      schlagChooserSeat: schlagChooser,
      farbeChooserSeat: farbeChooser,
      currentBet: 2,
      betChallengerSeat: null,
      betPending: false,
      lastBettingTeam: null,
      teamTricksWon: [0, 0],
      targetScore,
      mode: 'OFFEN',
      isGestrichen,
      esGehenDieVier: false,
      esGehenDieVierPendingTeam: null,
      cutCard,
      weliHasGueter: false,
      weliIsAlwaysLowestTrump: weliRole === 'kleinster_trumpf',
      gueterMustFollowTrump: false,
      pointsOnGehenWhenGestrichen: 2,
      hasGueter,
      hasSupergueter,
      weliRole,
    };

    const state: FullGameState = {
      matchId,
      code,
      name: matchName,
      gameType: this.gameType,
      maxPlayers: this.maxPlayers,
      status: 'IN_PROGRESS',
      chatEnabled,
      chatMessages: [],
      totalRounds: Math.max(1, totalRounds),
      currentRound: 1,
      phase: 'BIDDING', // Ansage Phase: Schlag & Farbe
      dealerSeat,
      currentTurnSeat: schlagChooser, // Vorhand chooses Schlag first
      declarerSeat: null,
      gameMode: null,
      minMode: null,
      talonTaken: false,
      players,
      hands,
      talon: deck.slice(this.maxPlayers * 5),
      discardedCards: [],
      wattenState,
      wattenOptions: options,
      biddingState: {
        phase: 'OPENING',
        currentBid: 2,
        holderSeat: null,
        challengerSeat: null,
        currentTurnSeat: schlagChooser,
        passedSeats: [],
        history: [],
      },
      currentTrick: [],
      trickLeadSeat: schlagChooser,
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

    return state;
  }

  public startNewRound(state: FullGameState): FullGameState {
    const deck = DeckFactory.createShuffledDeck(this.gameType);
    const hands: Card[][] = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      hands.push(DeckFactory.sortCards(deck.slice(i * 5, (i + 1) * 5)));
      state.players[i]!.tricksWon = 0;
      state.players[i]!.cardPointsWon = 0;
    }

    const dealerSeat = state.dealerSeat;
    const schlagChooser = (dealerSeat + 1) % this.maxPlayers;
    const farbeChooser = dealerSeat;
    const cutCard = deck[deck.length - 1] || null;

    const targetScore = state.wattenState?.targetScore || 15;
    const teamScores: [number, number] = [
      state.players[0]!.score,
      state.players[1]!.score,
    ];

    // Gestrichen: teamScore >= targetScore - 2 (z.B. >= 13 bei 15 Punkten)
    const isGestrichen: [boolean, boolean] = [
      teamScores[0] >= targetScore - 2,
      teamScores[1] >= targetScore - 2,
    ];

    // "Es gehen die Vier": genau ein Team gestrichen UND Punkteabstand >= 4
    let esGehenDieVier = false;
    let esGehenDieVierPendingTeam: number | null = null;
    let startingBet = 2;

    if (isGestrichen[0] && !isGestrichen[1] && teamScores[0] - teamScores[1] >= 4) {
      esGehenDieVier = true;
      esGehenDieVierPendingTeam = 0;
      startingBet = 4;
    } else if (isGestrichen[1] && !isGestrichen[0] && teamScores[1] - teamScores[0] >= 4) {
      esGehenDieVier = true;
      esGehenDieVierPendingTeam = 1;
      startingBet = 4;
    }

    state.hands = hands;
    state.talon = deck.slice(this.maxPlayers * 5);
    state.discardedCards = [];
    state.currentTrick = [];
    state.trickHistory = [];
    state.phase = 'BIDDING';
    state.declarerSeat = null;
    state.gameMode = null;
    state.currentTurnSeat = schlagChooser;
    state.trickLeadSeat = schlagChooser;

    const hasGueter = state.wattenState?.hasGueter !== false;
    const hasSupergueter = state.wattenState?.hasSupergueter === true;
    const weliRole = state.wattenState?.weliRole || 'kleinster_trumpf';

    state.wattenState = {
      schlag: null,
      farbe: null,
      schlagChooserSeat: schlagChooser,
      farbeChooserSeat: farbeChooser,
      currentBet: startingBet,
      betChallengerSeat: null,
      betPending: false,
      lastBettingTeam: null,
      teamTricksWon: [0, 0],
      targetScore,
      mode: state.wattenState?.mode || 'OFFEN',
      isGestrichen,
      esGehenDieVier,
      esGehenDieVierPendingTeam,
      cutCard,
      weliHasGueter: state.wattenState?.weliHasGueter || false,
      weliIsAlwaysLowestTrump: weliRole === 'kleinster_trumpf',
      gueterMustFollowTrump: state.wattenState?.gueterMustFollowTrump || false,
      pointsOnGehenWhenGestrichen: state.wattenState?.pointsOnGehenWhenGestrichen || 2,
      hasGueter,
      hasSupergueter,
      weliRole,
    };

    state.biddingState = {
      phase: 'OPENING',
      currentBid: startingBet,
      holderSeat: null,
      challengerSeat: null,
      currentTurnSeat: schlagChooser,
      passedSeats: [],
      history: [],
    };

    state.timer.turnStartedAt = Date.now();
    return state;
  }

  /**
   * Helper: Calculates the rank of "Der Guete" given the Schlag.
   * Order: 7(2) -> 8(3) -> 9(4) -> 10(8) -> Unter(5) -> Ober(6) -> König(7) -> Ass(9) -> 7(2).
   */
  public static getGueterRank(schlag: CardRank, weliHasGueter: boolean = false): CardRank | null {
    if (schlag === 1) {
      // Weli: alone at top unless weliHasGueter is enabled
      return weliHasGueter ? 2 : null;
    }
    switch (schlag) {
      case 2: // 7
        return 3; // 8
      case 3: // 8
        return 4; // 9
      case 4: // 9
        return 8; // 10
      case 8: // 10
        return 5; // Unter
      case 5: // Unter
        return 6; // Ober
      case 6: // Ober
        return 7; // König
      case 7: // König
        return 9; // Ass
      case 9: // Ass: wraps around to 7!
        return 2;
      default:
        return null;
    }
  }

  /**
   * Helper: Calculates the rank of "Der Superguete" (one rank above "Der Guete" in trump suit).
   */
  public static getSupergueterRank(schlag: CardRank, weliHasGueter: boolean = false): CardRank | null {
    const gueter = WattenEngine.getGueterRank(schlag, weliHasGueter);
    if (!gueter) return null;
    return WattenEngine.getGueterRank(gueter, weliHasGueter);
  }

  /**
   * Standard rank power for cards within the same suit:
   * Ass(9) > König(7) > Ober(6) > Unter(5) > 10(8) > 9(4) > 8(3) > 7(2) > Weli(1).
   */
  public static getStandardRankPower(rank: CardRank): number {
    switch (rank) {
      case 9: return 9; // Ass
      case 7: return 8; // König
      case 6: return 7; // Ober
      case 5: return 6; // Unter
      case 8: return 5; // 10
      case 4: return 4; // 9
      case 3: return 3; // 8
      case 2: return 2; // 7
      case 1: return 1; // Weli
      default: return 0;
    }
  }

  /**
   * Evaluates card power in Watten according to South Tyrolean / Bavarian hierarchy:
   * 1. Kritische (if mode === 'KRITISCH'): Herz König (Max) > Schell 7 (Belli) > Eichel 7 (Spitz).
   * 2. Der Superguete (if enabled): Schlag + 2 in Trumpffarbe.
   * 3. Der Guete (if enabled): Schlag + 1 in Trumpffarbe.
   * 4. Der Rechte: Schlag in Trumpffarbe.
   * 5. Weitere Schläge: Karten des gleichen Rangs in anderen Farben.
   * 6. Weli als kleinster Trumpf (wenn weliRole === 'kleinster_trumpf').
   * 7. Trumpfkarten: Weitere Karten der Trumpffarbe.
   * 8. Angespielte Farbe: Karten der ausgespielten Farbe des ersten Stiches.
   * 9. Fremde Farben: Wertlos (1000 + Rank).
   */
  public getCardPower(
    card: Card,
    leadCard: Card | null,
    wattenState: WattenState,
  ): number {
    const { schlag, farbe, mode, weliHasGueter } = wattenState;
    if (!schlag || !farbe) return 0;

    const hasGueter = wattenState.hasGueter !== false;
    const hasSupergueter = wattenState.hasSupergueter === true;
    const weliRole = wattenState.weliRole ?? 'kleinster_trumpf';

    // Optional: Mode KRITISCH (Maxi, Belli, Spitz)
    if (mode === 'KRITISCH') {
      if (card.suit === 'HERZ' && card.rank === 7) return 10003; // Maxi (Herz König)
      if (card.suit === 'SCHELL' && card.rank === 2) return 10002; // Belli (Schell 7)
      if (card.suit === 'EICHEL' && card.rank === 2) return 10001; // Spitz (Eichel 7)
    }

    const gueterRank = hasGueter ? WattenEngine.getGueterRank(schlag, weliHasGueter) : null;
    const supergueterRank = (hasGueter && hasSupergueter) ? WattenEngine.getSupergueterRank(schlag, weliHasGueter) : null;

    // 1. Der Superguete
    if (supergueterRank !== null && card.suit === farbe && card.rank === supergueterRank) {
      return 9500;
    }

    // 2. Der Guete
    if (gueterRank !== null && card.suit === farbe && card.rank === gueterRank) {
      return 9000;
    }

    // 3. Der Rechte
    if (card.suit === farbe && card.rank === schlag) {
      return 8000;
    }

    // 4. Weitere Schläge
    if (card.rank === schlag && card.suit !== farbe) {
      return 7000;
    }

    // Special: Weli as Schlag
    if (schlag === 1 && card.id === 'SCHELL_WELI') {
      return 8500;
    }

    // 5. Weli als kleinster Trumpf
    if (card.id === 'SCHELL_WELI' && weliRole === 'kleinster_trumpf') {
      return 5001; // Kleiner als Trumpf 7 (5002)
    }

    // 6. Trumpfkarten
    if (card.suit === farbe) {
      return 5000 + WattenEngine.getStandardRankPower(card.rank);
    }

    // 7. Angespielte Farbe (Lead Suit)
    if (leadCard && card.suit === leadCard.suit) {
      return 3000 + WattenEngine.getStandardRankPower(card.rank);
    }

    // 8. Fremde Farben
    return 1000 + WattenEngine.getStandardRankPower(card.rank);
  }

  /**
   * Static helper for card power comparison.
   */
  public static getWattenCardPower(
    card: Card,
    schlag: CardRank,
    farbe: Suit,
    leadSuit?: Suit,
    mode: WattenGameMode = 'KRITISCH',
  ): number {
    const engine = new WattenEngine('watten_2');
    const mockState: WattenState = {
      schlag,
      farbe,
      schlagChooserSeat: 0,
      farbeChooserSeat: 1,
      currentBet: 2,
      betChallengerSeat: null,
      betPending: false,
      teamTricksWon: [0, 0],
      mode,
    };
    const leadCard = leadSuit ? ({ suit: leadSuit, rank: 2 } as Card) : null;
    return engine.getCardPower(card, leadCard, mockState);
  }

  /**
   * Check if a card counts as a Trumpf card (or Rechte/Guete in Trumpf).
   */
  public isTrumpfCard(card: Card, wattenState: WattenState): boolean {
    if (!wattenState.farbe) return false;
    if (card.suit === wattenState.farbe) return true;
    const weliRole = wattenState.weliRole ?? 'kleinster_trumpf';
    if (weliRole === 'kleinster_trumpf' && card.id === 'SCHELL_WELI') {
      return true;
    }
    return false;
  }

  /**
   * Check if a card is an exempt trump (Der Rechte, Der Guete oder Der Superguete).
   */
  public isExemptTrumpf(card: Card, wattenState: WattenState): boolean {
    const { schlag, farbe, weliHasGueter } = wattenState;
    if (!schlag || !farbe) return false;
    const hasGueter = wattenState.hasGueter !== false;
    const hasSupergueter = wattenState.hasSupergueter === true;

    const gueterRank = hasGueter ? WattenEngine.getGueterRank(schlag, weliHasGueter) : null;
    const supergueterRank = (hasGueter && hasSupergueter) ? WattenEngine.getSupergueterRank(schlag, weliHasGueter) : null;

    const isSupergueter = supergueterRank !== null && card.suit === farbe && card.rank === supergueterRank;
    const isGueter = gueterRank !== null && card.suit === farbe && card.rank === gueterRank;
    const isRechter = card.suit === farbe && card.rank === schlag;
    const isOtherSchlag = card.rank === schlag;
    return isSupergueter || isGueter || isRechter || isOtherSchlag;
  }

  /**
   * Returns legal cards for seatIndex:
   * - Lead player can play ANY card.
   * - On Trumpf lead: subsequent players must follow Trumpf (regular Trumpf) if they hold one.
   *   Rechter, Gueter, and Schläge are exempt from forced play.
   * - On non-Trumpf lead: NO Farbzwang! Any card can be played.
   */
  public getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[] {
    const hand = state.hands[seatIndex] || [];
    if (hand.length === 0) return [];

    const ws = state.wattenState;
    if (!ws || !ws.schlag || !ws.farbe || state.currentTrick.length === 0) {
      return [...hand];
    }

    const leadPlay = state.currentTrick[0]!;
    const leadCard = leadPlay.card;
    const isLeadTrump = this.isTrumpfCard(leadCard, ws);

    // In Watten: Absolutely NO Farb- or Stichzwang!
    // The ONLY exception: If Vorhand plays Trumpf in the 1st trick ("Trumpf ausspeiben")!
    const isFirstTrick = state.trickHistory.length === 0;
    const isVorhandLead = state.trickLeadSeat === ws.schlagChooserSeat;

    if (isLeadTrump && isFirstTrick && isVorhandLead) {
      // Regular trumps in hand (non-exempt)
      const regularTrumps = hand.filter(
        (c) => this.isTrumpfCard(c, ws) && !this.isExemptTrumpf(c, ws),
      );

      // If player has regular trumps, they MUST play a trump (regular or exempt trump/schlag)
      if (regularTrumps.length > 0) {
        return hand.filter(
          (c) => this.isTrumpfCard(c, ws) || c.rank === ws.schlag,
        );
      }
      // If no regular trumps, player can play ANY card (retaining Rechter/Gueter is legal!)
      return [...hand];
    }

    // All other tricks or non-trump lead: No Farbzwang / No Stichzwang in Watten!
    return [...hand];
  }

  public getLegalCardIds(state: FullGameState, seatIndex: number): string[] {
    return this.getLegalCardsToPlay(state, seatIndex).map((c) => c.id);
  }

  /**
   * Handles choosing Schlag (rank) or Farbe (suit) during Watten announcement phase.
   */
  public handleWattenAnnounce(
    state: FullGameState,
    seatIndex: number,
    payload: { schlag?: CardRank; farbe?: Suit; action?: string },
  ): FullGameState {
    const ws = state.wattenState;
    if (!ws || state.phase !== 'BIDDING') {
      throw new Error('Nicht in der Ansage-Phase.');
    }

    if (payload.action === 'schlagtausch') {
      // Swap announcer roles for this round
      const temp = ws.schlagChooserSeat;
      ws.schlagChooserSeat = ws.farbeChooserSeat;
      ws.farbeChooserSeat = temp;
      state.currentTurnSeat = ws.schlagChooserSeat;
      return state;
    }

    if (payload.schlag !== undefined) {
      if (seatIndex !== ws.schlagChooserSeat) {
        throw new Error('Du bist nicht an der Reihe, den Schlag anzusagen.');
      }
      if (payload.schlag < 2 || payload.schlag > 9) {
        throw new Error('Ungültiger Schlag. Gültige Ränge sind 7er bis Ass.');
      }
      ws.schlag = payload.schlag;
      // Switch turn to Farbe chooser
      state.currentTurnSeat = ws.farbeChooserSeat;
      state.biddingState.currentTurnSeat = ws.farbeChooserSeat;
    } else if (payload.farbe !== undefined) {
      if (seatIndex !== ws.farbeChooserSeat) {
        throw new Error('Du bist nicht an der Reihe, die Farbe anzusagen.');
      }
      ws.farbe = payload.farbe;
    }

    // If both Schlag & Farbe are selected:
    if (ws.schlag !== null && ws.farbe !== null) {
      if (ws.esGehenDieVier && ws.esGehenDieVierPendingTeam !== null) {
        // Gestrichen team must decide: Halten (play 4 points) or Gehen (give 2 points to opponent)
        state.currentTurnSeat = ws.esGehenDieVierPendingTeam === 0 ? 0 : 1;
      } else {
        state.phase = 'TRICK_PLAY';
        const leadSeat = ws.schlagChooserSeat; // Vorhand leads first trick
        state.currentTurnSeat = leadSeat;
        state.trickLeadSeat = leadSeat;
      }
    }

    state.timer.turnStartedAt = Date.now();
    return state;
  }

  /**
   * Handles betting ("Schlagen" / "Halten" / "Gehen") in Watten.
   */
  public handleWattenBet(
    state: FullGameState,
    seatIndex: number,
    action: 'bet' | 'hold' | 'fold' | 'es_gehen_die_vier_response',
    decision?: 'hold' | 'fold',
  ): { state: FullGameState; roundEnded: boolean } {
    const ws = state.wattenState;
    if (!ws) throw new Error('Kein Watten-Zustand vorhanden.');

    const playerTeam = seatIndex % 2; // Team 0 (seats 0, 2) or Team 1 (seats 1, 3)
    const opponentTeam = 1 - playerTeam;

    // Handle "Es gehen die Vier" response before trick play begins
    if (ws.esGehenDieVier && ws.esGehenDieVierPendingTeam !== null && ws.esGehenDieVierPendingTeam !== undefined) {
      const resp = action === 'es_gehen_die_vier_response' ? decision : action;
      if (resp === 'fold' || action === 'fold') {
        const trailingTeam = 1 - (ws.esGehenDieVierPendingTeam ?? 0);
        const wonPoints = ws.pointsOnGehenWhenGestrichen || 2;
        return {
          state: this.finalizeWattenRound(
            state,
            trailingTeam,
            `Gestrichenes Team ist bei "Es gehen die Vier" gegangen (+${wonPoints} Pkt).`,
            wonPoints,
          ),
          roundEnded: true,
        };
      }
      // Held: play round for 4 points
      ws.esGehenDieVier = false;
      ws.esGehenDieVierPendingTeam = null;
      ws.currentBet = 4;
      state.phase = 'TRICK_PLAY';
      state.currentTurnSeat = ws.schlagChooserSeat;
      state.trickLeadSeat = ws.schlagChooserSeat;
      state.timer.turnStartedAt = Date.now();
      return { state, roundEnded: false };
    }

    if (action === 'bet') {
      // If a bet is pending, this is a COUNTER-RAISE (Drüberschlagen / Gegen-Erhöhen)
      // Alternating bids: same team cannot raise twice consecutively
      if (ws.lastBettingTeam === playerTeam) {
        throw new Error('Dein Team hat bereits als letztes erhöht.');
      }
      // Bietverbot if any team is gestrichen
      if (ws.isGestrichen && (ws.isGestrichen[0] || ws.isGestrichen[1])) {
        throw new Error('In gestrichenem Zustand darf nicht geboten werden.');
      }

      ws.currentBet += 1;
      ws.betPending = true;
      ws.betChallengerSeat = seatIndex;
      ws.lastBettingTeam = playerTeam;

      // Opponent team must respond
      state.currentTurnSeat = (seatIndex + 1) % this.maxPlayers;
      return { state, roundEnded: false };
    }

    if (action === 'hold') {
      if (!ws.betPending) throw new Error('Kein offenes Gebot zum Halten.');
      ws.betPending = false;
      ws.betChallengerSeat = null;
      // Return turn to whoever's turn it was to play the next card into the trick
      const nextCardPlayer = (state.trickLeadSeat + state.currentTrick.length) % this.maxPlayers;
      state.currentTurnSeat = nextCardPlayer;
      return { state, roundEnded: false };
    }

    if (action === 'fold') {
      if (!ws.betPending) throw new Error('Kein offenes Gebot zum Aufgeben.');
      // Folded team loses: challenger's team wins previous points (currentBet - 1)
      const wonPoints = Math.max(2, ws.currentBet - 1);
      return {
        state: this.finalizeWattenRound(
          state,
          opponentTeam,
          `${state.players[seatIndex]?.username || 'Gegner'} ist gegangen (+${wonPoints} Pkt).`,
          wonPoints,
        ),
        roundEnded: true,
      };
    }

    return { state, roundEnded: false };
  }

  /**
   * Determines the winner of a trick in Watten:
   * Highest power wins. In case of tie (e.g. two "Weitere Schläge"), earlier played card wins.
   */
  public determineTrickWinner(
    trick: { seatIndex: number; card: Card }[],
    leadCard: Card,
    wattenState: WattenState,
  ): number {
    let winningSeat = trick[0]!.seatIndex;
    let maxPower = this.getCardPower(trick[0]!.card, leadCard, wattenState);

    for (let i = 1; i < trick.length; i++) {
      const play = trick[i]!;
      const power = this.getCardPower(play.card, leadCard, wattenState);
      // Strictly greater beats earlier card; equal power preserves earlier card
      if (power > maxPower) {
        maxPower = power;
        winningSeat = play.seatIndex;
      }
    }

    return winningSeat;
  }

  public handlePlayCard(
    state: FullGameState,
    seatIndex: number,
    cardId: string,
  ): TrickPlayResult {
    if (state.phase !== 'TRICK_PLAY') {
      throw new Error('Nicht in der Spiel-Phase.');
    }
    if (state.currentTurnSeat !== seatIndex) {
      throw new Error('Nicht an der Reihe.');
    }
    if (state.wattenState?.betPending) {
      throw new Error('Zuerst muss über das Gebot („Halten“ oder „Gehen“) entschieden werden.');
    }

    const hand = state.hands[seatIndex]!;
    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) {
      throw new Error('Karte nicht auf der Hand.');
    }

    const legalCards = this.getLegalCardsToPlay(state, seatIndex);
    if (!legalCards.some((c) => c.id === cardId)) {
      throw new Error('Diese Karte darf laut Trumpfzwang nicht gespielt werden.');
    }

    const [playedCard] = hand.splice(cardIdx, 1);
    state.currentTrick.push({ seatIndex, card: playedCard! });

    // Trick completed when all players have played their card
    if (state.currentTrick.length === this.maxPlayers) {
      const leadCard = state.currentTrick[0]!.card;
      const winnerSeat = this.determineTrickWinner(
        state.currentTrick,
        leadCard,
        state.wattenState!,
      );

      const winnerPlayer = state.players[winnerSeat]!;
      winnerPlayer.tricksWon += 1;

      const winnerTeam = winnerSeat % 2;
      state.wattenState!.teamTricksWon[winnerTeam] += 1;

      const trickNumber = state.trickHistory.length + 1;
      const trickRecord: Trick = {
        trickNumber,
        leadSeat: state.trickLeadSeat,
        cards: [...state.currentTrick],
        winnerSeat,
        points: 0,
      };
      state.trickHistory.push(trickRecord);
      state.trickLeadSeat = winnerSeat;
      state.currentTurnSeat = winnerSeat;

      // First team to reach 3 tricks wins the round immediately!
      if (state.wattenState!.teamTricksWon[winnerTeam] >= 3) {
        const wonPoints = state.wattenState!.currentBet;
        const finalizedState = this.finalizeWattenRound(
          state,
          winnerTeam,
          `Team ${winnerTeam === 0 ? 'A' : 'B'} hat 3 Stiche erzielt (+${wonPoints} Punkte).`,
          wonPoints,
        );
        return {
          state: finalizedState,
          trickCompleted: true,
          roundEnded: true,
        };
      }

      return {
        state,
        trickCompleted: true,
        roundEnded: false,
      };
    }

    // Trick ongoing: advance to next seat
    state.currentTurnSeat = (state.currentTurnSeat + 1) % this.maxPlayers;
    state.timer.turnStartedAt = Date.now();
    return {
      state,
      trickCompleted: false,
      roundEnded: false,
    };
  }

  public clearCurrentTrick(state: FullGameState): FullGameState {
    state.currentTrick = [];
    return state;
  }

  /**
   * Finalizes a Watten round, awards points, and checks for match completion.
   */
  private finalizeWattenRound(
    state: FullGameState,
    winningTeam: number,
    reason: string,
    pointsWon: number,
  ): FullGameState {
    state.phase = 'ROUND_SUMMARY';

    // Award score to players of winning team
    for (let i = 0; i < this.maxPlayers; i++) {
      if (i % 2 === winningTeam) {
        state.players[i]!.score += pointsWon;
      }
    }

    const roundResult: RoundResult = {
      roundNumber: state.currentRound,
      dealerSeat: state.dealerSeat,
      declarerSeat: winningTeam,
      gameMode: 0 as any,
      declarerWon: true,
      declarerCardPoints: state.wattenState!.teamTricksWon[winningTeam],
      defenderCardPoints: state.wattenState!.teamTricksWon[1 - winningTeam],
      scoreDeltaDeclarer: pointsWon,
      scoreDeltaDefenders: 0,
      reason,
      scoresAfterRound: state.players.map((p) => ({
        seatIndex: p.seatIndex,
        score: p.score,
      })),
    };

    state.lastRoundResult = roundResult;

    // Check match completion: targetScore reached
    const targetScore = state.wattenState?.targetScore || 15;
    const teamWonMatch = state.players.some((p) => p.score >= targetScore);
    const roundsFinished = state.currentRound >= state.totalRounds;

    if (teamWonMatch || roundsFinished) {
      state.phase = 'MATCH_COMPLETED';
      state.status = 'COMPLETED';
      state.matchResult = this.computeMatchResult(state);
    }

    return state;
  }

  public handleSurrender(
    state: FullGameState,
    seatIndex: number,
    surrenderType?: 'round' | 'match',
  ): FullGameState {
    const playerTeam = seatIndex % 2;
    const opponentTeam = 1 - playerTeam;
    const wonPoints = state.wattenState?.currentBet || 2;

    if (surrenderType === 'match') {
      const targetScore = state.wattenState?.targetScore || 15;
      for (let i = 0; i < this.maxPlayers; i++) {
        if (i % 2 === opponentTeam) {
          state.players[i]!.score += targetScore;
        }
      }
      state.phase = 'MATCH_COMPLETED';
      state.status = 'COMPLETED';
      state.matchResult = this.computeMatchResult(state);
      return state;
    }

    return this.finalizeWattenRound(
      state,
      opponentTeam,
      `${state.players[seatIndex]?.username || 'Spieler'} hat die Runde aufgegeben.`,
      wonPoints,
    );
  }

  public advanceToNextRound(state: FullGameState): FullGameState {
    state.currentRound += 1;
    state.dealerSeat = (state.dealerSeat + 1) % this.maxPlayers;
    state.lastRoundResult = null;
    return this.startNewRound(state);
  }

  public computeMatchResult(state: FullGameState): MatchResult {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    return {
      matchId: state.matchId,
      totalRounds: state.currentRound,
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
