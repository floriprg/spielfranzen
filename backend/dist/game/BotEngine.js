import { getLegalCardIds } from './sanitizer.js';
export class BotEngine {
    /**
     * Generates a Bot decision for the bidding phase.
     */
    static decideBidAction(state, seatIndex) {
        const hand = state.hands[seatIndex];
        const { biddingState } = state;
        // Evaluate hand strength (high cards & suit distribution)
        const handPower = BotEngine.evaluateHandPower(hand);
        if (biddingState.phase === 'OPENING') {
            // Open if hand is above threshold
            if (handPower.maxScore >= 16) {
                return { action: 'open', bidValue: 4 };
            }
            return { action: 'pass' };
        }
        if (biddingState.phase === 'DUEL') {
            const { holderSeat, challengerSeat, currentBid } = biddingState;
            // Bot is challenger
            if (seatIndex === challengerSeat) {
                const nextBid = currentBid + 1;
                if (nextBid <= handPower.bidLimit && nextBid <= 12) {
                    return { action: 'raise', bidValue: nextBid };
                }
                return { action: 'pass' };
            }
            // Bot is holder
            if (seatIndex === holderSeat) {
                if (currentBid <= handPower.bidLimit) {
                    return { action: 'hold', bidValue: currentBid };
                }
                return { action: 'pass' };
            }
        }
        return { action: 'pass' };
    }
    /**
     * Generates a Bot decision for talon pickup and declaration.
     */
    static decideTalonAction(state, seatIndex) {
        const minMode = state.minMode || 5;
        // If minMode is 11 or 12, Handspiel is mandatory
        if (minMode >= 11) {
            return {
                action: 'declare_hand',
                selectedMode: minMode,
            };
        }
        // Always take talon if minMode <= 10
        const full13 = [...state.hands[seatIndex], ...state.talon];
        // Find best trump suit among 4 suits
        const suitCounts = { EICHEL: 0, LAUB: 0, SCHELL: 0, HERZ: 0 };
        for (const c of full13) {
            suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        }
        let bestSuit = 'EICHEL';
        let maxSuitCount = -1;
        for (const [s, count] of Object.entries(suitCounts)) {
            if (count > maxSuitCount) {
                maxSuitCount = count;
                bestSuit = s;
            }
        }
        // Map suit to mode 5..8
        const suitToMode = {
            EICHEL: 5,
            LAUB: 6,
            SCHELL: 7,
            HERZ: 8,
        };
        let chosenMode = suitToMode[bestSuit];
        if (chosenMode < minMode) {
            chosenMode = Math.min(10, Math.max(minMode, chosenMode));
        }
        // Pick 3 cards to discard (prefer non-trump cards with lowest rank or points)
        const sortedDiscards = [...full13].sort((a, b) => {
            // Keep trump cards
            const aIsTrump = a.suit === bestSuit ? 1 : 0;
            const bIsTrump = b.suit === bestSuit ? 1 : 0;
            if (aIsTrump !== bIsTrump)
                return aIsTrump - bIsTrump;
            // Discard 0-point cards first
            if (a.points !== b.points)
                return a.points - b.points;
            // Lower rank first
            return a.rank - b.rank;
        });
        const discardedCardIds = sortedDiscards.slice(0, 3).map((c) => c.id);
        return {
            action: 'take_talon',
            discardedCardIds,
            selectedMode: chosenMode,
        };
    }
    /**
     * Generates a Bot decision for playing a card in Trick Play.
     */
    static decideCardToPlay(state, seatIndex) {
        const hand = state.hands[seatIndex];
        const legalIds = getLegalCardIds(hand, state.currentTrick, state.gameMode);
        if (legalIds.length === 0) {
            throw new Error(`No legal cards available for seat ${seatIndex}`);
        }
        const legalCards = hand.filter((c) => legalIds.includes(c.id));
        const mode = state.gameMode || 5;
        // Bettl: Always play lowest rank card to avoid winning trick
        if (mode === 9 || mode === 11) {
            legalCards.sort((a, b) => a.rank - b.rank);
            return legalCards[0].id;
        }
        // Mord: Always play highest rank card to win trick
        if (mode === 10 || mode === 12) {
            legalCards.sort((a, b) => b.rank - a.rank);
            return legalCards[0].id;
        }
        // Color games (5..8):
        if (state.currentTrick.length === 0) {
            // Leading trick: Lead high cards or trump
            legalCards.sort((a, b) => b.points - a.points || b.rank - a.rank);
            return legalCards[0].id;
        }
        // Following in trick:
        // If can win, play lowest winning card or highest point card
        legalCards.sort((a, b) => b.points - a.points || a.rank - b.rank);
        return legalCards[0].id;
    }
    static evaluateHandPower(hand) {
        let pointSum = 0;
        const suitCounts = { EICHEL: 0, LAUB: 0, SCHELL: 0, HERZ: 0 };
        for (const c of hand) {
            pointSum += c.points;
            suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        }
        const maxSuitCount = Math.max(...Object.values(suitCounts));
        const highCardCount = hand.filter((c) => c.rank >= 7).length; // Ass, 10, König
        let maxScore = pointSum + maxSuitCount * 4 + highCardCount * 3;
        let bidLimit = 4;
        if (maxScore >= 45) {
            bidLimit = 10;
        }
        else if (maxScore >= 35) {
            bidLimit = 8;
        }
        else if (maxScore >= 26) {
            bidLimit = 6;
        }
        else if (maxScore >= 18) {
            bidLimit = 5;
        }
        else if (maxScore >= 14) {
            bidLimit = 4;
        }
        else {
            bidLimit = 0; // Pass
        }
        return { maxScore, bidLimit };
    }
}
//# sourceMappingURL=BotEngine.js.map