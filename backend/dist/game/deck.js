const SUITS = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
const SUIT_NAMES = {
    EICHEL: 'Eichel',
    LAUB: 'Laub',
    SCHELL: 'Schell',
    HERZ: 'Herz',
};
const REGULAR_RANKS = [
    { rank: 9, points: 11, shortName: 'A', rankName: 'Ass' },
    { rank: 8, points: 10, shortName: '10', rankName: '10er' },
    { rank: 7, points: 4, shortName: 'K', rankName: 'König' },
    { rank: 6, points: 3, shortName: 'O', rankName: 'Ober' },
    { rank: 5, points: 2, shortName: 'U', rankName: 'Unter' },
    { rank: 4, points: 0, shortName: '9', rankName: '9er' },
    { rank: 3, points: 0, shortName: '8', rankName: '8er' },
    { rank: 2, points: 0, shortName: '7', rankName: '7er' },
];
export function createDeck() {
    const cards = [];
    for (const suit of SUITS) {
        for (const r of REGULAR_RANKS) {
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
    // 33rd Card: Weli (Schell 6)
    cards.push({
        id: 'SCHELL_WELI',
        suit: 'SCHELL',
        rank: 1, // Lowest Schell card, below 7er
        points: 0,
        name: 'Schell Weli',
        shortName: 'W',
    });
    return cards;
}
export function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
}
export function createShuffledDeck() {
    return shuffleDeck(createDeck());
}
export function sortCards(cards, trumpSuit) {
    const suitOrder = {
        EICHEL: 0,
        LAUB: 1,
        SCHELL: 2,
        HERZ: 3,
    };
    return [...cards].sort((a, b) => {
        // If trumpSuit is provided, put trump cards first
        if (trumpSuit) {
            if (a.suit === trumpSuit && b.suit !== trumpSuit)
                return -1;
            if (b.suit === trumpSuit && a.suit !== trumpSuit)
                return 1;
        }
        if (a.suit !== b.suit) {
            return suitOrder[a.suit] - suitOrder[b.suit];
        }
        // Inside same suit, descending rank (higher rank first)
        return b.rank - a.rank;
    });
}
//# sourceMappingURL=deck.js.map