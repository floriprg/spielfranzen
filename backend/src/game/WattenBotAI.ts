import {
  Card,
  CardRank,
  FullGameState,
  Suit,
  WattenState,
} from '@spielfranzen/shared';
import { WattenEngine } from './WattenEngine.js';

export class WattenBotAI {
  /**
   * Chooses the optimal Schlag (rank) for Vorhand.
   * Prefers ranks with multiple cards in hand, or higher ranks (Ass, König, Ober...).
   */
  public static chooseSchlag(hand: Card[]): CardRank {
    if (!hand || hand.length === 0) return 9; // Ass fallback

    // Count frequency of each rank in hand
    const counts: Record<number, number> = {};
    for (const card of hand) {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    }

    // Sort ranks by frequency desc, then by standard power desc
    const sortedRanks = Object.keys(counts)
      .map(Number)
      .sort((a, b) => {
        const countDiff = counts[b]! - counts[a]!;
        if (countDiff !== 0) return countDiff;
        return WattenEngine.getStandardRankPower(b as CardRank) - WattenEngine.getStandardRankPower(a as CardRank);
      });

    return (sortedRanks[0] as CardRank) || 9;
  }

  /**
   * Chooses the optimal Trumpffarbe for Geber.
   * Weighs suit length, holding the Rechter, or holding the Gueter.
   */
  public static chooseFarbe(hand: Card[], schlag: CardRank | null): Suit {
    const suits: Suit[] = ['HERZ', 'SCHELL', 'LAUB', 'EICHEL'];
    if (!hand || hand.length === 0) return 'HERZ';

    const gueterRank = schlag ? WattenEngine.getGueterRank(schlag) : null;

    let bestSuit: Suit = 'HERZ';
    let maxScore = -1;

    for (const s of suits) {
      let score = 0;
      const suitCards = hand.filter((c) => c.suit === s);
      score += suitCards.length * 2;

      // Bonus for holding the Rechter
      if (schlag && suitCards.some((c) => c.rank === schlag)) {
        score += 4;
      }
      // Bonus for holding Der Guete
      if (gueterRank && suitCards.some((c) => c.rank === gueterRank)) {
        score += 5;
      }
      // Bonus for high cards in that suit
      for (const c of suitCards) {
        score += WattenEngine.getStandardRankPower(c.rank) * 0.2;
      }

      if (score > maxScore) {
        maxScore = score;
        bestSuit = s;
      }
    }

    return bestSuit;
  }

  /**
   * Evaluates overall hand strength in Watten.
   * Range: ~0 to 15+ points.
   */
  public static evaluateHandStrength(
    hand: Card[],
    wattenState: WattenState,
    wattenEngine: WattenEngine,
  ): number {
    let score = 0;
    for (const card of hand) {
      const power = wattenEngine.getCardPower(card, null, wattenState);
      if (power >= 9000) score += 5.0; // Gueter
      else if (power >= 8000) score += 4.0; // Rechter
      else if (power >= 7000) score += 3.0; // Weitere Schläge
      else if (power >= 5000) score += 1.8; // Trumpf
      else if (power >= 3000) score += 0.5; // Lead suit
    }
    return score;
  }

  /**
   * Decides whether to hold or fold when "Es gehen die Vier" is active.
   */
  public static decideEsGehenDieVier(
    state: FullGameState,
    seatIndex: number,
    wattenEngine: WattenEngine,
  ): 'hold' | 'fold' {
    const hand = state.hands[seatIndex] || [];
    const ws = state.wattenState;
    if (!ws) return 'fold';

    const strength = this.evaluateHandStrength(hand, ws, wattenEngine);
    // If hand has solid strength (e.g. holding Rechter or Gueter or multiple trumps), hold!
    return strength >= 5.0 ? 'hold' : 'fold';
  }

  /**
   * Decides betting actions ("bet" / "hold" / "fold" / "pass").
   */
  public static decideBetAction(
    state: FullGameState,
    seatIndex: number,
    wattenEngine: WattenEngine,
  ): { action: 'bet' | 'hold' | 'fold' | 'pass' } {
    const ws = state.wattenState;
    if (!ws) return { action: 'pass' };

    const myTeam = seatIndex % 2;
    const hand = state.hands[seatIndex] || [];
    const strength = this.evaluateHandStrength(hand, ws, wattenEngine);
    const myTeamTricks = ws.teamTricksWon[myTeam];

    // If opponent has raised: must decide "hold" vs "fold" (or re-raise)
    if (ws.betPending && ws.betChallengerSeat !== null && ws.betChallengerSeat % 2 !== myTeam) {
      // Need 3 tricks to win. If we already have 2 tricks, or strong cards:
      if (myTeamTricks >= 2 || strength >= 4.5 || (myTeamTricks === 1 && strength >= 3.0)) {
        return { action: 'hold' };
      }
      return { action: 'fold' };
    }

    // Not pending: decide whether to raise ("Schlagen")
    if (!ws.betPending && state.currentTurnSeat === seatIndex && ws.currentBet < 11) {
      // Don't raise if forbidden by gestrichen
      if (ws.isGestrichen && (ws.isGestrichen[0] || ws.isGestrichen[1])) {
        return { action: 'pass' };
      }
      if (ws.lastBettingTeam === myTeam) {
        return { action: 'pass' };
      }

      // If team already has 2 tricks and holds a guaranteed winner:
      if (myTeamTricks === 2 && strength >= 3.5) {
        return { action: 'bet' };
      }
      // If holding monster hand:
      if (strength >= 8.5) {
        return { action: 'bet' };
      }
    }

    return { action: 'pass' };
  }

  /**
   * Decides the card to play in trick play:
   * - Respects Trumpfzwang.
   * - In 4-player Watten: NEVER needlessly overtake partner if partner already owns the trick!
   * - When beating opponent: plays the lowest card that wins the trick.
   * - When losing or ducking: discards lowest useless card.
   */
  public static decideCardToPlay(
    state: FullGameState,
    seatIndex: number,
    wattenEngine: WattenEngine,
  ): string {
    const legalCards = wattenEngine.getLegalCardsToPlay(state, seatIndex);
    if (legalCards.length === 0) return '';
    if (legalCards.length === 1) return legalCards[0]!.id;

    const ws = state.wattenState;
    if (!ws) return legalCards[0]!.id;

    const maxPlayers = state.maxPlayers || 2;
    const currentTrick = state.currentTrick;
    const isLead = currentTrick.length === 0;

    // 1. Bot is leading the trick:
    if (isLead) {
      // If holding Gueter or Rechter and team has 2 tricks, lead it to seal the round!
      const myTeam = seatIndex % 2;
      if (ws.teamTricksWon[myTeam] === 2) {
        const topTrump = legalCards.find(
          (c) => wattenEngine.getCardPower(c, null, ws) >= 8000,
        );
        if (topTrump) return topTrump.id;
      }

      // Sort legal cards by power ascending:
      // Lead a safe low card to explore or draw trumps
      const sorted = [...legalCards].sort(
        (a, b) => wattenEngine.getCardPower(a, null, ws) - wattenEngine.getCardPower(b, null, ws),
      );

      // Prefer leading a non-trump low card
      const nonTrump = sorted.find((c) => !wattenEngine.isTrumpfCard(c, ws));
      return nonTrump ? nonTrump.id : sorted[0]!.id;
    }

    // 2. Bot is following a trick:
    const leadCard = currentTrick[0]!.card;
    const currentWinnerSeat = wattenEngine.determineTrickWinner(currentTrick, leadCard, ws);
    const myTeam = seatIndex % 2;
    const winnerTeam = currentWinnerSeat % 2;

    // Check if partner is currently winning the trick (in 4-player Watten)
    const isPartnerWinning = maxPlayers === 4 && winnerTeam === myTeam && currentWinnerSeat !== seatIndex;

    // PARTNER IS WINNING:
    // DO NOT OVERTAKE PARTNER! Discard lowest card
    if (isPartnerWinning) {
      // Sort legal cards by power ascending
      const sorted = [...legalCards].sort(
        (a, b) => wattenEngine.getCardPower(a, leadCard, ws) - wattenEngine.getCardPower(b, leadCard, ws),
      );
      // Discard lowest card (e.g. foreign non-trump card)
      return sorted[0]!.id;
    }

    // OPPONENT IS WINNING:
    const currentWinningPower = wattenEngine.getCardPower(
      currentTrick.find((p) => p.seatIndex === currentWinnerSeat)!.card,
      leadCard,
      ws,
    );

    // Cards in legal hand that beat the currently winning card
    const winningCards = legalCards
      .filter((c) => wattenEngine.getCardPower(c, leadCard, ws) > currentWinningPower)
      .sort(
        (a, b) => wattenEngine.getCardPower(a, leadCard, ws) - wattenEngine.getCardPower(b, leadCard, ws),
      );

    if (winningCards.length > 0) {
      // Play the LOWEST winning card that takes the trick!
      return winningCards[0]!.id;
    }

    // Cannot beat opponent's card: discard lowest useless card
    const sorted = [...legalCards].sort(
      (a, b) => wattenEngine.getCardPower(a, leadCard, ws) - wattenEngine.getCardPower(b, leadCard, ws),
    );
    return sorted[0]!.id;
  }
}
