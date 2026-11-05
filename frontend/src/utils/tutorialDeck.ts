import { Card, CardRank, Suit } from '@spielfranzen/shared';

export const SUITS: Suit[] = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];

export const SUIT_LABELS: Record<
  Suit,
  { name: string; color: string; desc: string; badgeBg: string; border: string }
> = {
  EICHEL: {
    name: 'Eichel',
    color: 'text-amber-500',
    desc: 'Traditionelle Eichel (Modus 5)',
    badgeBg: 'bg-amber-950/60',
    border: 'border-amber-700/50',
  },
  LAUB: {
    name: 'Laub / Grün',
    color: 'text-emerald-400',
    desc: 'Grünes Blatt (Modus 6)',
    badgeBg: 'bg-emerald-950/60',
    border: 'border-emerald-700/50',
  },
  SCHELL: {
    name: 'Schell',
    color: 'text-yellow-400',
    desc: 'Gelbe Glocke / Schelle (Modus 7)',
    badgeBg: 'bg-yellow-950/60',
    border: 'border-yellow-700/50',
  },
  HERZ: {
    name: 'Herz',
    color: 'text-rose-400',
    desc: 'Rotes Herz (Modus 8)',
    badgeBg: 'bg-rose-950/60',
    border: 'border-rose-700/50',
  },
};

export const RANKS: { rank: CardRank; points: number; shortName: string; rankName: string }[] = [
  { rank: 9, points: 11, shortName: 'A', rankName: 'Ass' },
  { rank: 8, points: 10, shortName: '10', rankName: '10er' },
  { rank: 7, points: 4, shortName: 'K', rankName: 'König' },
  { rank: 6, points: 3, shortName: 'O', rankName: 'Ober' },
  { rank: 5, points: 2, shortName: 'U', rankName: 'Unter' },
  { rank: 4, points: 0, shortName: '9', rankName: '9er' },
  { rank: 3, points: 0, shortName: '8', rankName: '8er' },
  { rank: 2, points: 0, shortName: '7', rankName: '7er' },
];

export function getAllCards(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const r of RANKS) {
      cards.push({
        id: `${suit}_${r.rank}`,
        suit,
        rank: r.rank,
        points: r.points,
        name: `${SUIT_LABELS[suit].name} ${r.rankName}`,
        shortName: r.shortName,
      });
    }
  }

  // Schell Weli (Schell 6, Rank 1, 0 Points)
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

export const SAMPLE_HAND: Card[] = [
  { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
  { id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10er', shortName: '10' },
  { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' },
  { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
  { id: 'EICHEL_6', suit: 'EICHEL', rank: 6, points: 3, name: 'Eichel Ober', shortName: 'O' },
  { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10er', shortName: '10' },
  { id: 'LAUB_3', suit: 'LAUB', rank: 3, points: 0, name: 'Laub 8er', shortName: '8' },
  { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
  { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7er', shortName: '7' },
  { id: 'SCHELL_WELI', suit: 'SCHELL', rank: 1, points: 0, name: 'Schell Weli', shortName: 'W' },
];
