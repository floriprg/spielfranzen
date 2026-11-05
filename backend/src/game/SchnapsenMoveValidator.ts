import {
  Card,
  CardRank,
  FullGameState,
  PlayedCard,
  SCHNAPSEN_CALL_CONFIG,
  SchnapsenCallType,
  Suit,
  TalonState,
} from '@spielfranzen/shared';

export interface AvailableSpecialActions {
  canSwapAtoutJack: boolean;
  canDeclareMarriageSuits: { suit: Suit; points: 20 | 40 }[];
  canCloseTalon: boolean;
  canClaim66: boolean;
  canRedeal3Buben: boolean;
}

export class SchnapsenMoveValidator {
  /**
   * Returns card ranking power.
   * Standard: Ass (9) > 10 (8) > König (7) > Ober/Dame (6) > Unter/Bube (5).
   * Zehnerloch: 10 (8) > König (7) > Ober/Dame (6) > Unter/Bube (5) > Ass (4).
   */
  public static getRankStrength(rank: CardRank, isZehnerloch: boolean = false): number {
    if (isZehnerloch) {
      if (rank === 9) return 4; // Ass is lowest!
      return rank; // 8 (10er) > 7 (König) > 6 (Ober) > 5 (Unter)
    }
    return rank;
  }

  /**
   * Returns the winning played card of a trick in progress.
   */
  public static getWinningCard(
    playedCards: PlayedCard[],
    trumpSuit: Suit | null,
    isZehnerloch: boolean = false,
  ): PlayedCard | null {
    if (playedCards.length === 0) return null;

    let winning = playedCards[0]!;
    for (let i = 1; i < playedCards.length; i++) {
      const challenger = playedCards[i]!;
      const winCard = winning.card;
      const challCard = challenger.card;

      const winIsTrump = trumpSuit !== null && winCard.suit === trumpSuit;
      const challIsTrump = trumpSuit !== null && challCard.suit === trumpSuit;

      if (challIsTrump && !winIsTrump) {
        winning = challenger;
      } else if (challIsTrump && winIsTrump) {
        if (
          this.getRankStrength(challCard.rank, isZehnerloch) >
          this.getRankStrength(winCard.rank, isZehnerloch)
        ) {
          winning = challenger;
        }
      } else if (!challIsTrump && !winIsTrump) {
        // Both non-trump: challenger must follow lead card suit and be higher
        if (challCard.suit === winCard.suit) {
          if (
            this.getRankStrength(challCard.rank, isZehnerloch) >
            this.getRankStrength(winCard.rank, isZehnerloch)
          ) {
            winning = challenger;
          }
        }
      }
    }

    return winning;
  }

  /**
   * Returns the strictly legal cards a player may play to the current trick.
   */
  public static getLegalCards(
    hand: Card[],
    currentTrick: PlayedCard[],
    talonState: TalonState,
    trumpSuit: Suit | null,
    callType?: SchnapsenCallType,
    pendingMarriageSuit?: Suit | null,
  ): Card[] {
    if (hand.length === 0) return [];

    const isZehnerloch = callType === 'ZEHNERLOCH';
    const effectiveTrump =
      callType && !SCHNAPSEN_CALL_CONFIG[callType].hasTrump ? null : trumpSuit;

    // 1. Lead card
    if (currentTrick.length === 0) {
      // If a marriage was announced, player MUST play either the König (7) or Dame (6) of that suit
      if (pendingMarriageSuit) {
        const marriageCards = hand.filter(
          (c) =>
            c.suit === pendingMarriageSuit && (c.rank === 7 || c.rank === 6),
        );
        if (marriageCards.length > 0) {
          return marriageCards;
        }
      }
      return [...hand];
    }

    // 2. Following a trick in TALON_OPEN (2P / Mitschreiben with open talon)
    // No Farbzwang or Stichzwang!
    if (talonState === 'TALON_OPEN') {
      return [...hand];
    }

    // 3. Following a trick in TALON_CLOSED (or 3P/4P where Farb- & Stichzwang is strict)
    const leadCard = currentTrick[0]!.card;
    const winningPlayed = this.getWinningCard(currentTrick, effectiveTrump, isZehnerloch)!;
    const winningCard = winningPlayed.card;

    const cardsOfLeadSuit = hand.filter((c) => c.suit === leadCard.suit);

    // Kaskade 1 & 2: Same suit as lead card
    if (cardsOfLeadSuit.length > 0) {
      // Stichzwang: Must play higher card of same suit if winning card is of lead suit
      if (winningCard.suit === leadCard.suit) {
        const higherSameSuit = cardsOfLeadSuit.filter(
          (c) =>
            this.getRankStrength(c.rank, isZehnerloch) >
            this.getRankStrength(winningCard.rank, isZehnerloch),
        );
        if (higherSameSuit.length > 0) {
          return higherSameSuit;
        }
      }
      // If cannot beat, or winning card was trumped: must follow lead suit (Farbzwang)
      return cardsOfLeadSuit;
    }

    // Kaskade 3: Suit not in hand -> Trumpfzwang (if trump is active and lead was not trump)
    if (effectiveTrump && leadCard.suit !== effectiveTrump) {
      const trumpCards = hand.filter((c) => c.suit === effectiveTrump);
      if (trumpCards.length > 0) {
        // If a trump was already played, must overtrump if possible
        if (winningCard.suit === effectiveTrump) {
          const higherTrumps = trumpCards.filter(
            (c) =>
              this.getRankStrength(c.rank, isZehnerloch) >
              this.getRankStrength(winningCard.rank, isZehnerloch),
          );
          if (higherTrumps.length > 0) {
            return higherTrumps;
          }
        }
        return trumpCards;
      }
    }

    // Kaskade 4: Neither lead suit nor trump in hand -> Discard any card
    return [...hand];
  }

  /**
   * Evaluates available special actions for the current turn player.
   */
  public static getAvailableSpecialActions(
    state: FullGameState,
    seatIndex: number,
  ): AvailableSpecialActions {
    const ss = state.schnapsenState;
    const hand = state.hands[seatIndex] || [];
    const isLeadTurn = state.currentTurnSeat === seatIndex && state.currentTrick.length === 0;

    const result: AvailableSpecialActions = {
      canSwapAtoutJack: false,
      canDeclareMarriageSuits: [],
      canCloseTalon: false,
      canClaim66: false,
      canRedeal3Buben: false,
    };

    if (!ss) return result;

    const is2PMode = ss.mode === 'CLASSIC_2P' || ss.mode === 'MITSCHREIBEN_3P';

    // 1. Swap Atout Jack (Unter/Bube rank 5 of trumpSuit)
    if (
      isLeadTurn &&
      is2PMode &&
      ss.allowTrumpfTausch !== false &&
      ss.talonState === 'TALON_OPEN' &&
      !ss.talonClosed &&
      ss.trumpCard !== null &&
      state.talon.length > 1
    ) {
      const hasTrumpJack = hand.some(
        (c) => c.suit === ss.trumpSuit && c.rank === 5,
      );
      if (hasTrumpJack) {
        result.canSwapAtoutJack = true;
      }
    }

    // 2. Announce Marriage (20 / 40)
    // Allowed if on lead.
    if (
      isLeadTurn &&
      (is2PMode || (ss.mode === 'BAUERNSCHNAPSEN_4P' && (!ss.callType || ss.callType === 'RUFER')))
    ) {
      const suits: Suit[] = ['HERZ', 'SCHELL', 'LAUB', 'EICHEL'];
      for (const suit of suits) {
        const hasKing = hand.some((c) => c.suit === suit && c.rank === 7);
        const hasOber = hand.some((c) => c.suit === suit && c.rank === 6);
        if (hasKing && hasOber) {
          result.canDeclareMarriageSuits.push({
            suit,
            points: suit === ss.trumpSuit ? 40 : 20,
          });
        }
      }
    }

    // 3. Close Talon (Zudrehen)
    // Earliest after 1st trick, talon open, stock > 2 cards
    if (
      isLeadTurn &&
      is2PMode &&
      ss.allowZudrehen !== false &&
      ss.talonState === 'TALON_OPEN' &&
      !ss.talonClosed &&
      state.trickHistory.length >= 1 &&
      state.talon.length > 2
    ) {
      result.canCloseTalon = true;
    }

    // 4. Claim 66 ("Danke genug")
    if (
      state.currentTurnSeat === seatIndex &&
      (is2PMode || !ss.callType || ss.callType === 'RUFER' || ss.callType === 'SCHNAPSER' || ss.callType === 'KONTRASCHNAPSER')
    ) {
      result.canClaim66 = true;
    }

    // 5. Redeal 3 Buben
    if (
      ss.schnapsenPhase === 'ATOUT_SELECTION' &&
      ss.atoutSelection?.first3Cards
    ) {
      const jackCount = ss.atoutSelection.first3Cards.filter((c) => c.rank === 5).length;
      if (jackCount === 3) {
        result.canRedeal3Buben = true;
      }
    }

    return result;
  }
}
