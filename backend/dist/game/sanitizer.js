import { GAME_MODE_INFO, } from '@spielfranzen/shared';
import { sortCards } from './deck.js';
export function getLegalCardIds(hand, currentTrick, gameMode) {
    if (hand.length === 0)
        return [];
    if (currentTrick.length === 0) {
        // Leading trick: any card is legal
        return hand.map((c) => c.id);
    }
    const leadCard = currentTrick[0].card;
    const leadSuit = leadCard.suit;
    // 1. Farbzwang: Must follow lead suit if possible
    const suitCards = hand.filter((c) => c.suit === leadSuit);
    if (suitCards.length > 0) {
        return suitCards.map((c) => c.id);
    }
    // 2. Trumpfzwang: Only in color games (modes 5, 6, 7, 8)
    if (gameMode && gameMode >= 5 && gameMode <= 8) {
        const trumpSuit = GAME_MODE_INFO[gameMode]?.trumpSuit;
        if (trumpSuit) {
            const trumpCards = hand.filter((c) => c.suit === trumpSuit);
            if (trumpCards.length > 0) {
                return trumpCards.map((c) => c.id);
            }
        }
    }
    // 3. Freie Karte: Can play any card if cannot follow suit and no trump required
    return hand.map((c) => c.id);
}
export function sanitizeGameStateForPlayer(state, userId) {
    let mySeatIndex = null;
    if (userId) {
        const seat = state.players.findIndex((p) => p.userId === userId);
        if (seat !== -1) {
            mySeatIndex = seat;
        }
    }
    const trumpSuit = state.gameMode && state.gameMode >= 5 && state.gameMode <= 8
        ? GAME_MODE_INFO[state.gameMode]?.trumpSuit
        : null;
    // Sanitized player list: replace private hand with handCount
    const sanitizedPlayers = state.players.map((p, idx) => {
        const seat = {
            seatIndex: p.seatIndex,
            userId: p.userId,
            username: p.username,
            isBot: p.isBot,
            isOnline: p.isOnline,
            score: p.score,
            role: p.role,
            handCount: state.hands[idx]?.length || 0,
            tricksWon: p.tricksWon,
            cardPointsWon: p.cardPointsWon,
        };
        return seat;
    });
    // Requesting player's hand
    let myHand = [];
    if (mySeatIndex !== null && state.hands[mySeatIndex]) {
        myHand = sortCards(state.hands[mySeatIndex], trumpSuit);
    }
    // Talon visibility: ONLY if declarer has chosen to take/reveal the talon!
    let talonCards = null;
    if (mySeatIndex !== null &&
        state.declarerSeat === mySeatIndex &&
        state.phase === 'TALON_AND_DECLARATION' &&
        state.talonRevealed &&
        !state.talonTaken) {
        // Declarer can see talon
        talonCards = state.talon;
    }
    // Compute legal cards for requesting player if it's their turn in trick play
    let legalCardIdsToPlay = [];
    if (mySeatIndex !== null &&
        state.phase === 'TRICK_PLAY' &&
        state.currentTurnSeat === mySeatIndex &&
        state.currentTrick.length < 3 &&
        myHand.length > 0) {
        legalCardIdsToPlay = getLegalCardIds(myHand, state.currentTrick, state.gameMode);
    }
    // Last completed trick from history
    const lastTrick = state.trickHistory.length > 0 ? state.trickHistory[state.trickHistory.length - 1] : null;
    return {
        matchId: state.matchId,
        code: state.code,
        status: state.status,
        totalRounds: state.totalRounds,
        currentRound: state.currentRound,
        phase: state.phase,
        dealerSeat: state.dealerSeat,
        currentTurnSeat: state.currentTurnSeat,
        declarerSeat: state.declarerSeat,
        gameMode: state.gameMode,
        minMode: state.minMode,
        talonTaken: state.talonTaken,
        talonRevealed: state.talonRevealed || false,
        mySeatIndex,
        players: sanitizedPlayers,
        myHand,
        talonCount: state.talon.length,
        talonCards,
        currentTrick: state.currentTrick,
        trickLeadSeat: state.trickLeadSeat,
        lastTrick,
        declarerCardPoints: state.declarerCardPoints,
        defenderCardPoints: state.defenderCardPoints,
        biddingState: state.biddingState,
        lastRoundResult: state.lastRoundResult,
        matchResult: state.matchResult,
        legalCardIdsToPlay,
        timer: state.timer,
    };
}
//# sourceMappingURL=sanitizer.js.map