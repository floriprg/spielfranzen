import {
  Card,
  FullGameState,
  SCHNAPSEN_CALL_CONFIG,
  Schnapsen3Mode,
  SchnapsenCallType,
  Suit,
} from '@spielfranzen/shared';
import { SchnapsenEngine } from './SchnapsenEngine.js';
import { SchnapsenMoveValidator } from './SchnapsenMoveValidator.js';

export class SchnapsenBotAI {
  /**
   * Decides whether the bot should perform a special action in Schnapsen:
   * - 3 Buben redeal
   * - Select Atout / Aufschlagen
   * - Bidding (Lizitation)
   * - Talon exchange (drücken)
   * - Trump swap with Unter
   * - 20 / 40 marriage announcement
   * - Talon closing (Zudrehen)
   * - Claim 66 ("Danke genug")
   */
  public static decideSpecialAction(
    state: FullGameState,
    seatIndex: number,
    schnapsenEngine: SchnapsenEngine,
  ): {
    action:
      | 'announce_marriage'
      | 'swap_trump'
      | 'close_talon'
      | 'declare_66'
      | 'select_atout'
      | 'redeal_3_buben'
      | 'bid'
      | 'pass'
      | 'kontra'
      | 'exchange_talon'
      | null;
    suit?: Suit;
    callType?: SchnapsenCallType;
    discardIds?: string[];
  } {
    const ss = state.schnapsenState;
    if (!ss) return { action: null };
    if (state.currentTurnSeat !== seatIndex) return { action: null };

    const hand = state.hands[seatIndex] || [];
    const special = SchnapsenMoveValidator.getAvailableSpecialActions(state, seatIndex);

    // 1. ATOUT SELECTION
    if (ss.schnapsenPhase === 'ATOUT_SELECTION') {
      if (special.canRedeal3Buben) {
        return { action: 'redeal_3_buben' };
      }
      // Pick suit with maximum cards from first 3 cards
      const first3 = ss.atoutSelection?.first3Cards || hand.slice(0, 3);
      const counts: Record<Suit, number> = { HERZ: 0, SCHELL: 0, LAUB: 0, EICHEL: 0 };
      for (const c of first3) {
        counts[c.suit] = (counts[c.suit] || 0) + 1;
      }
      let bestSuit: Suit = first3[0]?.suit || 'HERZ';
      let maxCount = 0;
      for (const s of ['HERZ', 'SCHELL', 'LAUB', 'EICHEL'] as Suit[]) {
        if (counts[s] > maxCount) {
          maxCount = counts[s];
          bestSuit = s;
        }
      }
      return { action: 'select_atout', suit: bestSuit };
    }

    // 2. BIDDING
    if (ss.schnapsenPhase === 'BIDDING') {
      const isVorhandSeat = (state.dealerSeat + 1) % state.maxPlayers! === seatIndex;
      // Evaluate hand for special games
      const trumpCards = hand.filter((c) => c.suit === ss.trumpSuit);
      const aces = hand.filter((c) => c.rank === 9);

      // Check if candidate for Bettler (0 trumps, very low cards)
      const isLowHand = hand.every((c) => c.rank <= 6);
      if (isLowHand && trumpCards.length === 0) {
        if (!ss.callType || SCHNAPSEN_CALL_CONFIG['BETTLER'].points > SCHNAPSEN_CALL_CONFIG[ss.callType].points) {
          return { action: 'bid', callType: 'BETTLER' };
        }
      }

      // Check if candidate for Durchmarsch/Gangl (5 very high cards)
      if (hand.length === 5 && hand.filter((c) => c.rank >= 8).length >= 4) {
        if (!ss.callType || SCHNAPSEN_CALL_CONFIG['GANGL'].points > SCHNAPSEN_CALL_CONFIG[ss.callType].points) {
          return { action: 'bid', callType: 'GANGL' };
        }
      }

      // If Vorhand and no bid placed yet, default is RUFER
      if (!ss.callType && isVorhandSeat) {
        return { action: 'bid', callType: 'RUFER' };
      }

      // Otherwise pass
      return { action: 'pass' };
    }

    // 3. TALON EXCHANGE (Dreierschnapsen)
    if (ss.schnapsenPhase === 'TALON_EXCHANGE') {
      // Discard 2 non-trump cards with lowest points
      const nonTrumps = hand.filter((c) => c.suit !== ss.trumpSuit);
      nonTrumps.sort((a, b) => a.points - b.points);

      const discardIds: string[] = [];
      if (nonTrumps.length >= 2) {
        discardIds.push(nonTrumps[0]!.id, nonTrumps[1]!.id);
      } else if (nonTrumps.length === 1) {
        discardIds.push(nonTrumps[0]!.id);
        const trumps = hand.filter((c) => c.suit === ss.trumpSuit).sort((a, b) => a.points - b.points);
        discardIds.push(trumps[0]!.id);
      } else {
        const trumps = [...hand].sort((a, b) => a.points - b.points);
        discardIds.push(trumps[0]!.id, trumps[1]!.id);
      }
      return { action: 'exchange_talon', discardIds };
    }

    // 4. TRICK PLAY ACTIONS
    // 4a. Check claim 66 if bot actually reached >= 66 eyes and has won at least 1 trick
    if (ss.playerEyes[seatIndex] >= 66 && (state.players[seatIndex]?.tricksWon || 0) > 0) {
      return { action: 'declare_66' };
    }

    // Only allowed before leading a card
    if (state.currentTrick.length > 0) return { action: null };

    // 4b. Swap trump with Jack if available
    if (special.canSwapAtoutJack && ss.trumpCard && ss.trumpCard.rank > 5) {
      return { action: 'swap_trump' };
    }

    // 4c. Announce Marriage if available
    if (special.canDeclareMarriageSuits.length > 0) {
      // Announce 40er if available, otherwise 20er
      const trumpMarriage = special.canDeclareMarriageSuits.find((m) => m.suit === ss.trumpSuit);
      if (trumpMarriage) {
        return { action: 'announce_marriage', suit: trumpMarriage.suit };
      }
      return { action: 'announce_marriage', suit: special.canDeclareMarriageSuits[0]!.suit };
    }

    // 4d. Close Talon (Zudrehen)
    if (special.canCloseTalon && ss.playerEyes[seatIndex] >= 42) {
      const hasTrumpAce = hand.some((c) => c.suit === ss.trumpSuit && c.rank === 9);
      const hasTrumpTen = hand.some((c) => c.suit === ss.trumpSuit && c.rank === 8);
      if (hasTrumpAce || hasTrumpTen) {
        return { action: 'close_talon' };
      }
    }

    return { action: null };
  }

  /**
   * Decides which card the bot should play.
   */
  public static decideCardToPlay(
    state: FullGameState,
    seatIndex: number,
    schnapsenEngine: SchnapsenEngine,
  ): string {
    const legalCards = schnapsenEngine.getLegalCardsToPlay(state, seatIndex);
    if (legalCards.length === 0) return '';
    if (legalCards.length === 1) return legalCards[0]!.id;

    const ss = state.schnapsenState;
    if (!ss) return legalCards[0]!.id;

    const isLead = state.currentTrick.length === 0;
    const isZehnerloch = ss.callType === 'ZEHNERLOCH';
    const effectiveTrump =
      ss.callType && !SCHNAPSEN_CALL_CONFIG[ss.callType].hasTrump ? null : ss.trumpSuit;

    // Special: Negative games (Bettler / Assbettler)
    const isNegativeGame = ss.callType === 'BETTLER' || ss.callType === 'ASSBETTLER';
    if (isNegativeGame) {
      if (seatIndex === state.declarerSeat) {
        // Declarer wants to play lowest card possible to avoid winning
        const sorted = [...legalCards].sort(
          (a, b) =>
            SchnapsenMoveValidator.getRankStrength(a.rank, false) -
            SchnapsenMoveValidator.getRankStrength(b.rank, false),
        );
        return sorted[0]!.id;
      } else {
        // Defender: if declarer has played, try to play just underneath declarer or discard high
        const sorted = [...legalCards].sort((a, b) => b.points - a.points);
        return sorted[0]!.id;
      }
    }

    // 1. LEADING A TRICK:
    if (isLead) {
      // If marriage was announced, must play K or D of marriage suit
      if (ss.pendingMarriageSuit) {
        const mCards = legalCards.filter(
          (c) =>
            c.suit === ss.pendingMarriageSuit && (c.rank === 7 || c.rank === 6),
        );
        if (mCards.length > 0) return mCards[0]!.id;
      }

      // In Zehnerloch: 10 is highest!
      if (isZehnerloch) {
        const tens = legalCards.filter((c) => c.rank === 8);
        if (tens.length > 0) return tens[0]!.id;
      }

      // If holding high non-trump Ace (11 eyes): lead it to secure eyes
      const nonTrumpAce = legalCards.find(
        (c) => c.rank === 9 && c.suit !== effectiveTrump,
      );
      if (nonTrumpAce) return nonTrumpAce.id;

      // Otherwise lead a low card (Unter or Ober)
      const lowNonTrump = legalCards
        .filter((c) => c.suit !== effectiveTrump)
        .sort((a, b) => a.points - b.points);
      if (lowNonTrump.length > 0) return lowNonTrump[0]!.id;

      // Discard lowest rank
      const sorted = [...legalCards].sort((a, b) => a.points - b.points);
      return sorted[0]!.id;
    }

    // 2. FOLLOWING A TRICK:
    const winningSoFar = SchnapsenMoveValidator.getWinningCard(
      state.currentTrick,
      effectiveTrump,
      isZehnerloch,
    )!;

    // Check if partner is currently winning the trick (Bauernschnapsen 4P)
    const isPartnerWinning =
      state.maxPlayers === 4 && winningSoFar.seatIndex % 2 === seatIndex % 2;

    if (isPartnerWinning) {
      // Schmieren! Play high points (Ass = 11, 10er = 10) if legal
      const smearCards = [...legalCards].sort((a, b) => b.points - a.points);
      return smearCards[0]!.id;
    }

    // Find cards that take the trick from opponent
    const winningCandidates = legalCards.filter((c) => {
      const simulatedTrick = [...state.currentTrick, { seatIndex, card: c }];
      const simulatedWin = SchnapsenMoveValidator.getWinningCard(
        simulatedTrick,
        effectiveTrump,
        isZehnerloch,
      );
      return simulatedWin?.seatIndex === seatIndex;
    });

    if (winningCandidates.length > 0) {
      // Play lowest strength winning card
      winningCandidates.sort(
        (a, b) =>
          SchnapsenMoveValidator.getRankStrength(a.rank, isZehnerloch) -
          SchnapsenMoveValidator.getRankStrength(b.rank, isZehnerloch),
      );
      return winningCandidates[0]!.id;
    }

    // Cannot win trick: discard lowest point card
    const sorted = [...legalCards].sort((a, b) => a.points - b.points);
    return sorted[0]!.id;
  }
}
