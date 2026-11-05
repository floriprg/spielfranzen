import { Card, CardRank, GameType, Suit } from '@spielfranzen/shared';

const SUITS: Suit[] = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];

const SUIT_NAMES: Record<Suit, string> = {
  EICHEL: 'Eichel',
  LAUB: 'Laub',
  SCHELL: 'Schell',
  HERZ: 'Herz',
};

interface RankDef {
  rank: CardRank;
  points: number;
  shortName: string;
  rankName: string;
}

const ALL_RANKS: RankDef[] = [
  { rank: 9, points: 11, shortName: 'A', rankName: 'Ass' },
  { rank: 8, points: 10, shortName: '10', rankName: '10er' },
  { rank: 7, points: 4, shortName: 'K', rankName: 'König' },
  { rank: 6, points: 3, shortName: 'O', rankName: 'Ober' },
  { rank: 5, points: 2, shortName: 'U', rankName: 'Unter' },
  { rank: 4, points: 0, shortName: '9', rankName: '9er' },
  { rank: 3, points: 0, shortName: '8', rankName: '8er' },
  { rank: 2, points: 0, shortName: '7', rankName: '7er' },
];

export class DeckFactory {
  /**
   * Creates a 33-card deck (used for Franzen, Watten 2er, Watten 4er).
   * 7, 8, 9, 10, Unter, Ober, König, Ass across all 4 suits + Schell Weli (Schell 6).
   */
  public static create33Deck(): Card[] {
    const cards: Card[] = [];

    for (const suit of SUITS) {
      for (const r of ALL_RANKS) {
        cards.push({
          id: `${suit}_${r.rank}`,
          suit,
          rank: r.rank,
          points: r.points,
          name: `${SUIT_NAMES[suit]} ${r.rankName}`,
          shortName: r.shortName,
        });
      }
    }

    // 33rd Card: Schell Weli (Rank 1, 0 points)
    cards.push({
      id: 'SCHELL_WELI',
      suit: 'SCHELL',
      rank: 1,
      points: 0,
      name: 'Schell Weli',
      shortName: 'W',
    });

    return cards;
  }

  /**
   * Creates a 20-card deck (used for 2er-Schnapsen).
   * 10(10), Unter(2), Ober(3), König(4), Ass(11) in all 4 suits.
   */
  public static create20Deck(): Card[] {
    const schnapsenRanks = ALL_RANKS.filter((r) => r.rank >= 5); // 5 (Unter) to 9 (Ass)
    const cards: Card[] = [];

    for (const suit of SUITS) {
      for (const r of schnapsenRanks) {
        cards.push({
          id: `${suit}_${r.rank}`,
          suit,
          rank: r.rank,
          points: r.points,
          name: `${SUIT_NAMES[suit]} ${r.rankName}`,
          shortName: r.shortName,
        });
      }
    }

    return cards;
  }

  /**
   * Creates a 24-card deck (used for 3er-Schnapsen / Bauernschnapsen).
   * 9(0), 10(10), Unter(2), Ober(3), König(4), Ass(11) in all 4 suits.
   */
  public static create24Deck(): Card[] {
    const schnapsen3Ranks = ALL_RANKS.filter((r) => r.rank >= 4); // 4 (9er) to 9 (Ass)
    const cards: Card[] = [];

    for (const suit of SUITS) {
      for (const r of schnapsen3Ranks) {
        cards.push({
          id: `${suit}_${r.rank}`,
          suit,
          rank: r.rank,
          points: r.points,
          name: `${SUIT_NAMES[suit]} ${r.rankName}`,
          shortName: r.shortName,
        });
      }
    }

    return cards;
  }

  /**
   * Returns the canonical deck for the specified game type.
   */
  public static createDeck(gameType: GameType = 'franzen'): Card[] {
    switch (gameType) {
      case 'watten_2':
      case 'watten_4':
      case 'franzen':
        return DeckFactory.create33Deck();
      case 'schnapsen_2':
      case 'schnapsen_3':
      case 'schnapsen_4':
        return DeckFactory.create20Deck();
      default:
        return DeckFactory.create33Deck();
    }
  }

  /**
   * Shuffles a given deck using the Fisher-Yates algorithm.
   */
  public static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  /**
   * Convenience method to create and shuffle a deck for a game type.
   */
  public static createShuffledDeck(gameType: GameType = 'franzen'): Card[] {
    return DeckFactory.shuffleDeck(DeckFactory.createDeck(gameType));
  }

  /**
   * Sorts cards (Trump first, then suit, then descending rank).
   */
  public static sortCards(cards: Card[], trumpSuit?: Suit | null): Card[] {
    const suitOrder: Record<Suit, number> = {
      EICHEL: 0,
      LAUB: 1,
      SCHELL: 2,
      HERZ: 3,
    };

    return [...cards].sort((a, b) => {
      if (trumpSuit) {
        if (a.suit === trumpSuit && b.suit !== trumpSuit) return -1;
        if (b.suit === trumpSuit && a.suit !== trumpSuit) return 1;
      }

      if (a.suit !== b.suit) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }

      return b.rank - a.rank;
    });
  }
}
