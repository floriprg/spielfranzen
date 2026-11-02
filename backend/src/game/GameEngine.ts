import {
  Card,
  FullGameState,
  GAME_MODE_INFO,
  GameMode,
  GameTimerConfig,
  MatchResult,
  PlayerSeatState,
  RoundResult,
  Trick,
} from '@spielfranzen/shared';
import { createDeck, shuffleDeck, sortCards } from './deck.js';
import { getLegalCardIds } from './sanitizer.js';

export class GameEngine {
  /**
   * Initializes a new match state with 3 seated players.
   */
  public static createInitialState(
    matchId: string,
    code: string,
    totalRounds: number,
    players: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: Partial<GameTimerConfig>,
    chatEnabled?: boolean,
  ): FullGameState {
    if (players.length !== 3) {
      throw new Error('A Franzen match requires exactly 3 players.');
    }

    const playerSeats: [PlayerSeatState, PlayerSeatState, PlayerSeatState] = [
      {
        seatIndex: 0,
        userId: players[0]!.userId,
        username: players[0]!.username,
        isBot: players[0]!.isBot,
        isOnline: true,
        score: 0,
        role: 'NONE',
        tricksWon: 0,
        cardPointsWon: 0,
      },
      {
        seatIndex: 1,
        userId: players[1]!.userId,
        username: players[1]!.username,
        isBot: players[1]!.isBot,
        isOnline: true,
        score: 0,
        role: 'NONE',
        tricksWon: 0,
        cardPointsWon: 0,
      },
      {
        seatIndex: 2,
        userId: players[2]!.userId,
        username: players[2]!.username,
        isBot: players[2]!.isBot,
        isOnline: true,
        score: 0,
        role: 'NONE',
        tricksWon: 0,
        cardPointsWon: 0,
      },
    ];

    // Dealer in round 1 is chosen randomly
    const dealerSeat = Math.floor(Math.random() * 3);

    const timerCfg: GameTimerConfig = {
      enabled: timerConfig?.enabled ?? true,
      turnTimeLimit: timerConfig?.turnTimeLimit ?? 60,
      totalTimeBank: timerConfig?.totalTimeBank ?? 300,
    };

    const state: FullGameState = {
      matchId,
      code,
      status: 'IN_PROGRESS',
      chatEnabled: chatEnabled ?? true,
      chatMessages: [],
      totalRounds,
      currentRound: 1,
      phase: 'DEALING',
      dealerSeat,
      currentTurnSeat: (dealerSeat + 1) % 3,
      declarerSeat: null,
      gameMode: null,
      minMode: null,
      talonTaken: false,
      players: playerSeats,
      hands: [[], [], []],
      talon: [],
      discardedCards: [],
      biddingState: {
        phase: 'OPENING',
        currentBid: 0,
        holderSeat: null,
        challengerSeat: null,
        currentTurnSeat: (dealerSeat + 1) % 3,
        passedSeats: [],
        history: [],
      },
      currentTrick: [],
      trickLeadSeat: 0,
      trickHistory: [],
      declarerCardPoints: 0,
      defenderCardPoints: 0,
      lastRoundResult: null,
      matchResult: null,
      timer: {
        config: timerCfg,
        turnStartedAt: null,
        turnDuration: timerCfg.turnTimeLimit,
        playerBanks: [
          timerCfg.totalTimeBank,
          timerCfg.totalTimeBank,
          timerCfg.totalTimeBank,
        ],
      },
    };

    return GameEngine.startNewRound(state);
  }

  /**
   * Starts or deals a round. Deals 10 cards to each player and 3 to talon.
   */
  public static startNewRound(state: FullGameState): FullGameState {
    const deck = shuffleDeck(createDeck());

    // 10 cards per player, 3 cards to talon
    const hand0 = deck.slice(0, 10);
    const hand1 = deck.slice(10, 20);
    const hand2 = deck.slice(20, 30);
    const talon = deck.slice(30, 33);

    const vorhand = (state.dealerSeat + 1) % 3;

    // Reset per-round player metrics
    for (const p of state.players) {
      p.role = 'NONE';
      p.tricksWon = 0;
      p.cardPointsWon = 0;
    }

    // Refresh depleted time banks for the new round so players always have time
    if (state.timer && state.timer.config?.enabled) {
      for (let i = 0; i < state.timer.playerBanks.length; i++) {
        if ((state.timer.playerBanks[i] ?? 0) < 60) {
          state.timer.playerBanks[i] = Math.min(
            state.timer.config.totalTimeBank,
            (state.timer.playerBanks[i] ?? 0) + 60,
          );
        }
      }
    }

    state.phase = 'BIDDING';
    state.declarerSeat = null;
    state.gameMode = null;
    state.minMode = null;
    state.talonTaken = false;
    state.talonRevealed = false;
    state.hands = [sortCards(hand0), sortCards(hand1), sortCards(hand2)];
    state.talon = talon;
    state.discardedCards = [];
    state.currentTrick = [];
    state.trickLeadSeat = 0;
    state.trickHistory = [];
    state.declarerCardPoints = 0;
    state.defenderCardPoints = 0;

    // Seating order for bidding: Vorhand -> Mittelhand -> Hinterhand
    state.biddingState = {
      phase: 'OPENING',
      currentBid: 0,
      holderSeat: null,
      challengerSeat: null,
      currentTurnSeat: vorhand,
      passedSeats: [],
      history: [
        {
          seatIndex: vorhand,
          username: state.players[vorhand]!.username,
          action: 'open',
          text: `Runde ${state.currentRound} gestartet. Vorhand (${state.players[vorhand]!.username}) ist am Zug.`,
        },
      ],
    };
    state.currentTurnSeat = vorhand;

    return state;
  }

  /**
   * Handles Bidding Actions (Vorhand-Halte-Prinzip)
   */
  public static handleBid(
    state: FullGameState,
    seatIndex: number,
    action: 'open' | 'raise' | 'hold' | 'pass',
    bidValue?: number,
  ): FullGameState {
    if (state.phase !== 'BIDDING') {
      throw new Error('Not in bidding phase.');
    }
    if (state.currentTurnSeat !== seatIndex) {
      throw new Error(`It is seat ${state.currentTurnSeat}'s turn, not seat ${seatIndex}.`);
    }

    const { biddingState } = state;
    const player = state.players[seatIndex]!;

    // --- PHASE: OPENING ---
    if (biddingState.phase === 'OPENING') {
      if (action === 'open') {
        biddingState.currentBid = 4;
        biddingState.holderSeat = seatIndex;
        biddingState.phase = 'DUEL';
        biddingState.history.push({
          seatIndex,
          username: player.username,
          action: 'open',
          bidValue: 4,
          text: `${player.username} eröffnet mit 4 ("Ich spiele")`,
        });

        // Next active player becomes challenger
        const challenger = GameEngine.getNextActiveSeat(seatIndex, biddingState.passedSeats);
        if (challenger === null) {
          // Both others already passed
          return GameEngine.concludeBidding(state, seatIndex, 4);
        }
        biddingState.challengerSeat = challenger;
        biddingState.currentTurnSeat = challenger;
        state.currentTurnSeat = challenger;
        return state;
      }

      if (action === 'pass') {
        biddingState.passedSeats.push(seatIndex);
        biddingState.history.push({
          seatIndex,
          username: player.username,
          action: 'pass',
          text: `${player.username} passt ("Weiter")`,
        });

        // Check if all 3 passed
        if (biddingState.passedSeats.length === 3) {
          biddingState.phase = 'ALL_PASSED';
          biddingState.history.push({
            seatIndex,
            username: 'System',
            action: 'pass',
            text: 'Alle 3 Spieler haben gepasst! Geber wandert weiter, neu ausgeteilt.',
          });

          // Dealer shifts clockwise, redeal without consuming currentRound
          state.dealerSeat = (state.dealerSeat + 1) % 3;
          return GameEngine.startNewRound(state);
        }

        // Pass to next player
        const nextSeat = (seatIndex + 1) % 3;
        biddingState.currentTurnSeat = nextSeat;
        state.currentTurnSeat = nextSeat;
        return state;
      }

      throw new Error(`Invalid action ${action} during OPENING phase.`);
    }

    // --- PHASE: DUEL ---
    if (biddingState.phase === 'DUEL') {
      const { holderSeat, challengerSeat, currentBid } = biddingState;

      // 1. Challenger raises
      if (seatIndex === challengerSeat && action === 'raise') {
        const val = bidValue !== undefined ? bidValue : currentBid + 1;
        if (val <= currentBid || val > 12) {
          throw new Error(`Invalid raise value ${val}. Must be between ${currentBid + 1} and 12.`);
        }

        biddingState.currentBid = val;
        biddingState.history.push({
          seatIndex,
          username: player.username,
          action: 'raise',
          bidValue: val,
          text: `${player.username} bietet auf ${val}`,
        });

        // Turn goes to Halter to hold or pass
        biddingState.currentTurnSeat = holderSeat!;
        state.currentTurnSeat = holderSeat!;
        return state;
      }

      // 2. Halter holds
      if (seatIndex === holderSeat && action === 'hold') {
        biddingState.history.push({
          seatIndex,
          username: player.username,
          action: 'hold',
          bidValue: currentBid,
          text: `${player.username} hält ${currentBid}`,
        });

        if (currentBid === 12) {
          // Halter holds 12! Bidding cannot go higher.
          return GameEngine.concludeBidding(state, holderSeat, 12);
        }

        // Turn returns to challenger to raise further or pass
        biddingState.currentTurnSeat = challengerSeat!;
        state.currentTurnSeat = challengerSeat!;
        return state;
      }

      // 3. Either Halter or Challenger passes ("Gehen" / "Weiter")
      if (action === 'pass') {
        biddingState.passedSeats.push(seatIndex);

        if (seatIndex === challengerSeat) {
          // Challenger gives up
          biddingState.history.push({
            seatIndex,
            username: player.username,
            action: 'pass',
            text: `${player.username} passt ("Weiter")`,
          });

          // Check if third player is still active
          const thirdPlayer = [0, 1, 2].find(
            (s) => s !== holderSeat && !biddingState.passedSeats.includes(s),
          );

          if (thirdPlayer !== undefined) {
            // Third player enters duel as new challenger
            biddingState.challengerSeat = thirdPlayer;
            biddingState.currentTurnSeat = thirdPlayer;
            state.currentTurnSeat = thirdPlayer;
            biddingState.history.push({
              seatIndex: thirdPlayer,
              username: state.players[thirdPlayer]!.username,
              action: 'open',
              text: `${state.players[thirdPlayer]!.username} ist jetzt am Zug gegen ${state.players[holderSeat!]!.username} (steht auf ${currentBid}).`,
            });
            return state;
          }

          // No one left! Halter wins bidding
          return GameEngine.concludeBidding(state, holderSeat!, currentBid);
        }

        if (seatIndex === holderSeat) {
          // Halter gives up! Challenger becomes the new Halter at currentBid
          biddingState.history.push({
            seatIndex,
            username: player.username,
            action: 'pass',
            text: `${player.username} (Halter) gibt auf`,
          });

          const newHolder = challengerSeat!;
          biddingState.holderSeat = newHolder;

          // Check if third player is still active
          const thirdPlayer = [0, 1, 2].find(
            (s) => s !== newHolder && !biddingState.passedSeats.includes(s),
          );

          if (thirdPlayer !== undefined) {
            // Third player enters duel as new challenger
            biddingState.challengerSeat = thirdPlayer;
            biddingState.currentTurnSeat = thirdPlayer;
            state.currentTurnSeat = thirdPlayer;
            biddingState.history.push({
              seatIndex: thirdPlayer,
              username: state.players[thirdPlayer]!.username,
              action: 'open',
              text: `${state.players[thirdPlayer]!.username} ist jetzt am Zug gegen ${state.players[newHolder]!.username} (steht auf ${currentBid}).`,
            });
            return state;
          }

          // No one left! New holder wins bidding
          return GameEngine.concludeBidding(state, newHolder, currentBid);
        }
      }

      throw new Error(`Invalid bid action ${action} for seat ${seatIndex} in DUEL phase.`);
    }

    return state;
  }

  private static getNextActiveSeat(fromSeat: number, passedSeats: number[]): number | null {
    for (let i = 1; i <= 2; i++) {
      const candidate = (fromSeat + i) % 3;
      if (!passedSeats.includes(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private static concludeBidding(
    state: FullGameState,
    declarerSeat: number,
    winningBid: number,
  ): FullGameState {
    state.biddingState.phase = 'COMPLETED';
    state.declarerSeat = declarerSeat;
    state.minMode = Math.max(5, winningBid) as GameMode;

    // Set roles
    for (let i = 0; i < 3; i++) {
      state.players[i]!.role = i === declarerSeat ? 'DECLARER' : 'DEFENDER';
    }

    state.phase = 'TALON_AND_DECLARATION';
    state.currentTurnSeat = declarerSeat;
    state.talonRevealed = false;

    state.biddingState.history.push({
      seatIndex: declarerSeat,
      username: state.players[declarerSeat]!.username,
      action: 'hold',
      bidValue: winningBid,
      text: `${state.players[declarerSeat]!.username} gewinnt das Bieten mit ${winningBid} und ist Alleinspieler (Mindestmodus: ${state.minMode})!`,
    });

    return state;
  }

  /**
   * Handles Talon pickup, discard, and Game Mode declaration.
   */
  public static handleTalonAction(
    state: FullGameState,
    seatIndex: number,
    action: 'take_talon' | 'declare_hand' | 'discard_and_declare',
    discardedCardIds?: string[],
    selectedMode?: number,
  ): FullGameState {
    if (state.phase !== 'TALON_AND_DECLARATION') {
      throw new Error('Not in talon and declaration phase.');
    }
    if (state.declarerSeat !== seatIndex) {
      throw new Error('Only the declarer can take talon or declare game mode.');
    }

    const minMode = state.minMode || 5;

    // Option 1: Direct Handspiel without talon (11: Doppelbettl or 12: Doppelmord)
    if (action === 'declare_hand') {
      if (selectedMode !== 11 && selectedMode !== 12) {
        throw new Error('Handspiel without talon is only allowed for mode 11 (Doppelbettl) or 12 (Doppelmord).');
      }
      if (selectedMode < minMode) {
        throw new Error(`Mode ${selectedMode} is lower than minimum required mode ${minMode}.`);
      }

      state.gameMode = selectedMode as GameMode;
      state.talonTaken = false;
      state.talonRevealed = false;

      // Start Trick Play
      state.phase = 'TRICK_PLAY';
      state.trickLeadSeat = seatIndex;
      state.currentTurnSeat = seatIndex;
      return state;
    }

    // Option 2: Step 1 - Take/Reveal Talon (declarer decides to play with talon)
    if (action === 'take_talon' && (!discardedCardIds || discardedCardIds.length === 0)) {
      if (minMode >= 11) {
        throw new Error('Taking talon is not permitted when bidding reached 11 or 12 (Handspiel mandatory).');
      }
      state.talonRevealed = true;
      return state;
    }

    // Option 3: Step 2 - Discard 3 cards and declare mode (or combined take_talon with discards)
    if (action === 'discard_and_declare' || (action === 'take_talon' && discardedCardIds)) {
      if (minMode >= 11) {
        throw new Error('Taking talon is not permitted when bidding reached 11 or 12 (Handspiel mandatory).');
      }
      if (!selectedMode || selectedMode < minMode || selectedMode > 10) {
        throw new Error(`Selected mode ${selectedMode} must be between ${minMode} and 10.`);
      }
      if (!discardedCardIds || discardedCardIds.length !== 3) {
        throw new Error('Declarer must discard exactly 3 cards.');
      }

      state.talonRevealed = true;

      // Combine hand (10 cards) + talon (3 cards) = 13 cards
      const declarerHand = [...state.hands[seatIndex]!, ...state.talon];

      // Validate discarded cards exist in declarer's 13 cards
      const discardedCards: Card[] = [];
      for (const cardId of discardedCardIds) {
        const foundIdx = declarerHand.findIndex((c) => c.id === cardId);
        if (foundIdx === -1) {
          throw new Error(`Card ${cardId} is not in declarer hand or talon.`);
        }
        discardedCards.push(declarerHand[foundIdx]!);
        declarerHand.splice(foundIdx, 1);
      }

      if (declarerHand.length !== 10) {
        throw new Error('After discarding, hand must contain exactly 10 cards.');
      }

      // Save state: Hand is now 10 cards, talon is taken, discarded cards stored
      const trumpSuit = GAME_MODE_INFO[selectedMode as GameMode]?.trumpSuit;
      state.hands[seatIndex] = sortCards(declarerHand, trumpSuit);
      state.discardedCards = discardedCards;
      state.talon = []; // Cleared from active game
      state.talonTaken = true;
      state.gameMode = selectedMode as GameMode;

      // In color games (5..8), discarded card points count for declarer
      if (selectedMode >= 5 && selectedMode <= 8) {
        state.declarerCardPoints = discardedCards.reduce((sum, c) => sum + c.points, 0);
      }

      // Transition to Trick Play: Declarer plays first card
      state.phase = 'TRICK_PLAY';
      state.trickLeadSeat = seatIndex;
      state.currentTurnSeat = seatIndex;
      return state;
    }

    throw new Error(`Invalid talon action: ${action}`);
  }

  /**
   * Returns list of legal cards for a given seat in the current trick.
   */
  public static getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[] {
    const hand = state.hands[seatIndex] || [];
    const legalIds = getLegalCardIds(hand, state.currentTrick, state.gameMode);
    return hand.filter((c) => legalIds.includes(c.id));
  }

  /**
   * Handles playing a card in Trick Play.
   */
  public static handlePlayCard(
    state: FullGameState,
    seatIndex: number,
    cardId: string,
  ): { state: FullGameState; trickCompleted: boolean; roundEnded: boolean } {
    if (state.phase !== 'TRICK_PLAY') {
      throw new Error('Not in trick play phase.');
    }
    // If previous trick was still on the table (e.g. in test loops or synchronous runs), clear it
    if (state.currentTrick.length >= 3) {
      state.currentTrick = [];
    }

    if (state.currentTurnSeat !== seatIndex) {
      throw new Error(`It is seat ${state.currentTurnSeat}'s turn, not seat ${seatIndex}.`);
    }

    const hand = state.hands[seatIndex]!;
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error(`Card ${cardId} is not in player hand.`);
    }

    const card = hand[cardIndex]!;
    const legalCardIds = getLegalCardIds(hand, state.currentTrick, state.gameMode);
    if (!legalCardIds.includes(cardId)) {
      throw new Error(`Playing ${card.name} violates suit/trump following rules.`);
    }

    // Remove card from hand and add to current trick
    hand.splice(cardIndex, 1);
    state.currentTrick.push({ seatIndex, card });

    // If trick is not yet complete (1 or 2 cards played)
    if (state.currentTrick.length < 3) {
      const nextTurn = (seatIndex + 1) % 3;
      state.currentTurnSeat = nextTurn;
      return { state, trickCompleted: false, roundEnded: false };
    }

    // --- Trick Complete (3 cards played) ---
    const trickWinnerSeat = GameEngine.determineTrickWinner(state.currentTrick, state.gameMode!);
    const trickPoints = state.currentTrick.reduce((sum, item) => sum + item.card.points, 0);

    const completedTrick: Trick = {
      trickNumber: state.trickHistory.length + 1,
      leadSeat: state.trickLeadSeat,
      cards: [...state.currentTrick],
      winnerSeat: trickWinnerSeat,
      points: trickPoints,
    };

    state.trickHistory.push(completedTrick);
    state.players[trickWinnerSeat]!.tricksWon += 1;
    state.players[trickWinnerSeat]!.cardPointsWon += trickPoints;

    if (trickWinnerSeat === state.declarerSeat) {
      state.declarerCardPoints += trickPoints;
    } else {
      state.defenderCardPoints += trickPoints;
    }

    // Next trick lead is the winner of this trick
    state.trickLeadSeat = trickWinnerSeat;
    state.currentTurnSeat = trickWinnerSeat;
    // NOTE: state.currentTrick holds all 3 cards so clients can see the complete trick for >= 3 seconds!

    // --- Check Instant Round End / Evaluation Rules ---
    const roundEvaluation = GameEngine.evaluateRound(state, completedTrick);

    if (roundEvaluation.isOver) {
      GameEngine.finalizeRound(state, roundEvaluation.declarerWon, roundEvaluation.reason);
      return { state, trickCompleted: true, roundEnded: true };
    }

    return { state, trickCompleted: true, roundEnded: false };
  }

  /**
   * Clears the completed trick from the table to start the next trick.
   */
  public static clearCurrentTrick(state: FullGameState): void {
    state.currentTrick = [];
  }

  /**
   * Evaluates the winner of a completed 3-card trick.
   */
  public static determineTrickWinner(
    trick: { seatIndex: number; card: Card }[],
    gameMode: GameMode,
  ): number {
    if (trick.length !== 3) {
      throw new Error('Trick must have 3 cards.');
    }

    const trumpSuit = GAME_MODE_INFO[gameMode]?.trumpSuit;
    const leadCard = trick[0]!.card;
    const leadSuit = leadCard.suit;

    // Check if any trump was played (Modes 5, 6, 7, 8)
    if (trumpSuit) {
      const trumpPlays = trick.filter((p) => p.card.suit === trumpSuit);
      if (trumpPlays.length > 0) {
        // Highest rank trump wins
        trumpPlays.sort((a, b) => b.card.rank - a.card.rank);
        return trumpPlays[0]!.seatIndex;
      }
    }

    // No trump played (or no trump mode): highest card of leadSuit wins
    const leadSuitPlays = trick.filter((p) => p.card.suit === leadSuit);
    leadSuitPlays.sort((a, b) => b.card.rank - a.card.rank);
    return leadSuitPlays[0]!.seatIndex;
  }

  /**
   * Evaluates whether the round has concluded after a trick.
   */
  private static evaluateRound(
    state: FullGameState,
    lastTrick: Trick,
  ): { isOver: boolean; declarerWon: boolean; reason: string } {
    const mode = state.gameMode!;
    const declarerSeat = state.declarerSeat!;
    const tricksPlayed = state.trickHistory.length;

    // 1. Color Games (Modes 5, 6, 7, 8)
    if (mode >= 5 && mode <= 8) {
      // Immediate win if declarer reaches 66 points
      if (state.declarerCardPoints >= 66) {
        return {
          isOver: true,
          declarerWon: true,
          reason: `Alleinspieler hat ${state.declarerCardPoints} Augen erreicht (>= 66)!`,
        };
      }
      // Immediate win if defenders pool >= 66 points
      if (state.defenderCardPoints >= 66) {
        return {
          isOver: true,
          declarerWon: false,
          reason: `Gegner haben ${state.defenderCardPoints} Augen erreicht (>= 66)!`,
        };
      }
      // If trick 10 finished and neither reached 66: winner of 10th trick wins!
      if (tricksPlayed === 10) {
        const lastTrickWinner = lastTrick.winnerSeat!;
        if (lastTrickWinner === declarerSeat) {
          return {
            isOver: true,
            declarerWon: true,
            reason: `Alleinspieler gewinnt durch den 10. (letzten) Stich!`,
          };
        } else {
          return {
            isOver: true,
            declarerWon: false,
            reason: `Gegner gewinnen durch den 10. (letzten) Stich!`,
          };
        }
      }
      return { isOver: false, declarerWon: false, reason: '' };
    }

    // 2. Bettl (9) & Doppelbettl (11): Goal is 0 tricks
    if (mode === 9 || mode === 11) {
      const modeName = mode === 9 ? 'Bettl' : 'Doppelbettl';
      if (lastTrick.winnerSeat === declarerSeat) {
        // Immediate loss if declarer takes any trick
        return {
          isOver: true,
          declarerWon: false,
          reason: `Alleinspieler hat Stich #${tricksPlayed} gemacht (${modeName} verloren)!`,
        };
      }
      if (tricksPlayed === 10) {
        // Declarer took 0 tricks across all 10 tricks!
        return {
          isOver: true,
          declarerWon: true,
          reason: `Alleinspieler hat keinen einzigen Stich gemacht (${modeName} gewonnen)!`,
        };
      }
      return { isOver: false, declarerWon: false, reason: '' };
    }

    // 3. Mord (10) & Doppelmord (12): Goal is all 10 tricks
    if (mode === 10 || mode === 12) {
      const modeName = mode === 10 ? 'Mord' : 'Doppelmord';
      if (lastTrick.winnerSeat !== declarerSeat) {
        // Immediate loss if any defender takes a trick
        const defenderName = state.players[lastTrick.winnerSeat!]?.username || 'Ein Gegner';
        return {
          isOver: true,
          declarerWon: false,
          reason: `${defenderName} hat Stich #${tricksPlayed} gemacht (${modeName} abgewehrt)!`,
        };
      }
      if (tricksPlayed === 10) {
        // Declarer took all 10 tricks!
        return {
          isOver: true,
          declarerWon: true,
          reason: `Alleinspieler hat alle 10 Stiche gemacht (${modeName} gewonnen)!`,
        };
      }
      return { isOver: false, declarerWon: false, reason: '' };
    }

    return { isOver: false, declarerWon: false, reason: '' };
  }

  /**
   * Finalizes round scoring (Zero-sum game).
   */
  public static finalizeRound(
    state: FullGameState,
    declarerWon: boolean,
    reason: string,
  ): FullGameState {
    const mode = state.gameMode!;
    const baseValue = GAME_MODE_INFO[mode].baseValue;
    const declarerSeat = state.declarerSeat!;

    // Zero-sum scoring:
    // If declarer won: Declarer +W, each defender -W/2
    // If declarer lost: Declarer -W, each defender +W/2
    const deltaDeclarer = declarerWon ? baseValue : -baseValue;
    const deltaDefenders = declarerWon ? -baseValue / 2 : baseValue / 2;

    for (let i = 0; i < 3; i++) {
      if (i === declarerSeat) {
        state.players[i]!.score += deltaDeclarer;
      } else {
        state.players[i]!.score += deltaDefenders;
      }
    }

    const roundResult: RoundResult = {
      roundNumber: state.currentRound,
      dealerSeat: state.dealerSeat,
      declarerSeat,
      gameMode: mode,
      declarerWon,
      declarerCardPoints: state.declarerCardPoints,
      defenderCardPoints: state.defenderCardPoints,
      scoreDeltaDeclarer: deltaDeclarer,
      scoreDeltaDefenders: deltaDefenders,
      reason,
      scoresAfterRound: state.players.map((p) => ({ seatIndex: p.seatIndex, score: p.score })),
    };

    state.lastRoundResult = roundResult;

    // Check if entire match has completed
    if (state.currentRound >= state.totalRounds) {
      state.phase = 'MATCH_COMPLETED';
      state.status = 'COMPLETED';
      state.matchResult = GameEngine.computeMatchResult(state);
    } else {
      state.phase = 'ROUND_SUMMARY';
    }

    return state;
  }

  /**
   * Advances to next round after round summary.
   */
  public static advanceToNextRound(state: FullGameState): FullGameState {
    if (state.phase !== 'ROUND_SUMMARY') {
      throw new Error('Can only advance to next round from ROUND_SUMMARY.');
    }
    state.currentRound += 1;
    state.dealerSeat = (state.dealerSeat + 1) % 3;
    state.lastRoundResult = null;
    return GameEngine.startNewRound(state);
  }

  /**
   * Computes final rankings and 3-player ELO adjustments.
   */
  public static computeMatchResult(state: FullGameState): MatchResult {
    // Sort players by score descending
    const sorted = [...state.players].sort((a, b) => b.score - a.score);

    // Compute Multi-player pairwise ELO adjustments (K = 32)
    // For each pair (i, j): S_ij = 1 (win), 0.5 (draw), 0 (loss)
    const K = 32;
    const eloDeltas: Record<string, number> = {};

    for (let i = 0; i < sorted.length; i++) {
      let totalChange = 0;
      const p1 = sorted[i]!;

      for (let j = 0; j < sorted.length; j++) {
        if (i === j) continue;
        const p2 = sorted[j]!;

        // Default base elo if bot or new user
        const r1 = 1000;
        const r2 = 1000;
        const expected1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));

        let actual1 = 0.5;
        if (p1.score > p2.score) actual1 = 1.0;
        else if (p1.score < p2.score) actual1 = 0.0;

        totalChange += (K / 2) * (actual1 - expected1);
      }
      eloDeltas[p1.userId] = Math.round(totalChange);
    }

    const rankings = sorted.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      username: p.username,
      isBot: p.isBot,
      finalScore: p.score,
      eloBefore: 1000,
      eloDelta: eloDeltas[p.userId] || 0,
      eloAfter: 1000 + (eloDeltas[p.userId] || 0),
    }));

    return {
      matchId: state.matchId,
      totalRounds: state.totalRounds,
      rankings,
    };
  }
}
