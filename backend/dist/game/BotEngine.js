import { GAME_MODE_INFO, } from '@spielfranzen/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameEngine } from './GameEngine.js';
import { getLegalCardIds } from './sanitizer.js';
export const DEFAULT_BOT_WEIGHTS = {
    name: 'Default Baseline',
    generation: 0,
    colorGameMinTrumpCount: 4,
    colorGameMinPower: 26,
    bettlMaxDangerousCards: 3,
    bettlMinLowCards: 5,
    mordMinAces: 2,
    mordMinMasters: 5,
    trumpLeadTendency: 1.0,
    smearAggression: 1.0,
    discardTrumpRetention: 2.0,
    discardBlankSuitBonus: 15,
    secondPlayerTakeLeadAggression: 1.0,
};
export class BotEngine {
    static championWeights = BotEngine.loadChampionWeights();
    static getChampionWeights() {
        return { ...BotEngine.championWeights };
    }
    static setChampionWeights(weights) {
        BotEngine.championWeights = { ...weights };
        BotEngine.saveChampionWeights(weights);
    }
    static getWeightsPath() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        return path.resolve(__dirname, '../config/championBotWeights.json');
    }
    static loadChampionWeights() {
        try {
            const filePath = BotEngine.getWeightsPath();
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                return { ...DEFAULT_BOT_WEIGHTS, ...JSON.parse(raw) };
            }
        }
        catch {
            // Fallback
        }
        return { ...DEFAULT_BOT_WEIGHTS };
    }
    static saveChampionWeights(weights) {
        try {
            const filePath = BotEngine.getWeightsPath();
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(weights, null, 2), 'utf-8');
        }
        catch (e) {
            console.warn('Could not save championBotWeights:', e);
        }
    }
    /**
     * Generates an intelligent Bot decision for the bidding phase.
     */
    static decideBidAction(state, seatIndex, weights = BotEngine.championWeights) {
        const hand = state.hands[seatIndex];
        const { biddingState } = state;
        const evaluation = BotEngine.evaluateHand(hand, weights);
        if (biddingState.phase === 'OPENING') {
            // Opening requires at least one viable mode (4 commits to playing at least mode 5..10)
            if (evaluation.maxViableBid >= 4) {
                return { action: 'open', bidValue: 4 };
            }
            return { action: 'pass' };
        }
        if (biddingState.phase === 'DUEL') {
            const { holderSeat, challengerSeat, currentBid } = biddingState;
            // Challenger turn
            if (seatIndex === challengerSeat) {
                const nextBid = currentBid + 1;
                if (nextBid <= 12 && BotEngine.canPlayAtLeast(evaluation, nextBid)) {
                    return { action: 'raise', bidValue: nextBid };
                }
                return { action: 'pass' };
            }
            // Holder turn (Vorhand-Halte-Prinzip)
            if (seatIndex === holderSeat) {
                if (BotEngine.canPlayAtLeast(evaluation, currentBid)) {
                    return { action: 'hold', bidValue: currentBid };
                }
                return { action: 'pass' };
            }
        }
        return { action: 'pass' };
    }
    /**
     * Generates an intelligent Bot decision for talon pickup and declaration.
     */
    static decideTalonAction(state, seatIndex, weights = BotEngine.championWeights) {
        const minMode = state.minMode || 5;
        const hand10 = state.hands[seatIndex];
        const eval10 = BotEngine.evaluateHand(hand10, weights);
        // If minMode is 11 or 12, Handspiel is mandatory by rule
        if (minMode >= 11) {
            const mode = minMode === 12 || eval10.canDoppelmord ? 12 : 11;
            return {
                action: 'declare_hand',
                selectedMode: mode,
            };
        }
        // Check if the 10-card hand is already a near-perfect Handspiel (11 or 12)
        if (eval10.canDoppelmord && minMode <= 12) {
            return { action: 'declare_hand', selectedMode: 12 };
        }
        if (eval10.canDoppelbettl && minMode <= 11) {
            return { action: 'declare_hand', selectedMode: 11 };
        }
        // Otherwise, take talon and optimize the 13-card hand
        const full13 = [...hand10, ...state.talon];
        // Evaluate best mode among available modes >= minMode
        const bestChoice = BotEngine.evaluate13CardHand(full13, minMode, weights);
        return {
            action: 'take_talon',
            discardedCardIds: bestChoice.discardedCardIds,
            selectedMode: bestChoice.selectedMode,
        };
    }
    /**
     * Generates an intelligent Bot decision for playing a card in Trick Play.
     */
    static decideCardToPlay(state, seatIndex, weights = BotEngine.championWeights) {
        const hand = state.hands[seatIndex];
        const legalIds = getLegalCardIds(hand, state.currentTrick, state.gameMode);
        if (legalIds.length === 0) {
            throw new Error(`No legal cards available for seat ${seatIndex}`);
        }
        if (legalIds.length === 1) {
            return legalIds[0];
        }
        const legalCards = hand.filter((c) => legalIds.includes(c.id));
        const mode = state.gameMode || 5;
        const isDeclarer = seatIndex === state.declarerSeat;
        // 1. Bettl & Doppelbettl (Modes 9 & 11: Declarer wants 0 tricks, Defenders want Declarer to win 1)
        if (mode === 9 || mode === 11) {
            return BotEngine.decideBettlCard(state, seatIndex, isDeclarer, legalCards);
        }
        // 2. Mord & Doppelmord (Modes 10 & 12: Declarer wants all 10 tricks, Defenders want to win 1)
        if (mode === 10 || mode === 12) {
            return BotEngine.decideMordCard(state, seatIndex, isDeclarer, legalCards);
        }
        // 3. Color Games (Modes 5..8: Eichel, Laub, Schell, Herz - Target 66 points)
        return BotEngine.decideColorCard(state, seatIndex, isDeclarer, legalCards, weights);
    }
    // =========================================================================
    // --- TRICK PLAY LOGIC: COLOR GAMES (5..8) ---
    // =========================================================================
    static decideColorCard(state, seatIndex, isDeclarer, legalCards, weights = BotEngine.championWeights) {
        const trumpSuit = GAME_MODE_INFO[state.gameMode]?.trumpSuit;
        const trick = state.currentTrick;
        const partnerSeat = isDeclarer
            ? -1
            : [0, 1, 2].find((s) => s !== seatIndex && s !== state.declarerSeat);
        // --- CASE 1: THIRD PLAYER TO PLAY (trick.length === 2) ---
        // Deterministic: Every legal card outcome can be simulated with 100% precision!
        if (trick.length === 2) {
            return BotEngine.decideThirdPlayerColorCard(state, seatIndex, isDeclarer, partnerSeat, legalCards, trumpSuit, weights);
        }
        // --- CASE 2: SECOND PLAYER TO PLAY (trick.length === 1) ---
        if (trick.length === 1) {
            return BotEngine.decideSecondPlayerColorCard(state, seatIndex, isDeclarer, partnerSeat, legalCards, trumpSuit, weights);
        }
        // --- CASE 3: LEADING PLAYER (trick.length === 0) ---
        return BotEngine.decideLeadColorCard(state, seatIndex, isDeclarer, legalCards, trumpSuit, weights);
    }
    /**
     * Third player in Color Game: Absolute certainty of trick winner and points.
     */
    static decideThirdPlayerColorCard(state, seatIndex, isDeclarer, partnerSeat, legalCards, trumpSuit, weights = BotEngine.championWeights) {
        const trick = state.currentTrick;
        const mode = state.gameMode;
        // Evaluate each legal card
        const candidates = legalCards.map((card) => {
            const simulated = [...trick, { seatIndex, card }];
            const winner = GameEngine.determineTrickWinner(simulated, mode);
            const points = trick[0].card.points + trick[1].card.points + card.points;
            return { card, winner, points };
        });
        if (isDeclarer) {
            // Declarer: Try to win the trick, or dump lowest points
            const winningCandidates = candidates.filter((c) => c.winner === seatIndex);
            if (winningCandidates.length > 0) {
                // Check if any winning card instantly terminates the round (>= 66 points)
                const instantWin = winningCandidates.find((c) => state.declarerCardPoints + c.points >= 66);
                if (instantWin)
                    return instantWin.card.id;
                // Otherwise pick the lowest rank/cost winning card to preserve high cards
                winningCandidates.sort((a, b) => {
                    const aIsTrump = a.card.suit === trumpSuit ? 1 : 0;
                    const bIsTrump = b.card.suit === trumpSuit ? 1 : 0;
                    if (aIsTrump !== bIsTrump)
                        return aIsTrump - bIsTrump; // Use non-trump winner first if possible
                    return a.card.rank - b.card.rank;
                });
                return winningCandidates[0].card.id;
            }
            // Declarer cannot win: Defenders will take this trick! Give them minimum points (0 points)
            candidates.sort((a, b) => a.card.points - b.card.points || a.card.rank - b.card.rank);
            return candidates[0].card.id;
        }
        // Defender:
        // Partner winning?
        const partnerWinning = candidates.filter((c) => c.winner === partnerSeat);
        if (partnerWinning.length > 0) {
            // Partner wins! Check if defenders can hit >= 66 instantly
            const instantWin = partnerWinning.find((c) => state.defenderCardPoints + c.points >= 66);
            if (instantWin)
                return instantWin.card.id;
            // SCHMIEREN: Partner wins regardless! Feed maximum points into defenders' pool (10, Ass, König)
            partnerWinning.sort((a, b) => b.card.points - a.card.points || b.card.rank - a.card.rank);
            return partnerWinning[0].card.id;
        }
        // Can Bot win against Declarer?
        const botWinning = candidates.filter((c) => c.winner === seatIndex);
        if (botWinning.length > 0) {
            // Check instant win
            const instantWin = botWinning.find((c) => state.defenderCardPoints + c.points >= 66);
            if (instantWin)
                return instantWin.card.id;
            // Win as cheaply as possible
            botWinning.sort((a, b) => {
                const aIsTrump = a.card.suit === trumpSuit ? 1 : 0;
                const bIsTrump = b.card.suit === trumpSuit ? 1 : 0;
                if (aIsTrump !== bIsTrump)
                    return aIsTrump - bIsTrump;
                return a.card.rank - b.card.rank;
            });
            return botWinning[0].card.id;
        }
        // Neither Defender can win (Declarer wins the trick):
        // WIMMELN: Play lowest points card (0-point cards: 7, 8, 9, Weli)
        candidates.sort((a, b) => a.card.points - b.card.points || a.card.rank - b.card.rank);
        return candidates[0].card.id;
    }
    /**
     * Second player in Color Game.
     */
    static decideSecondPlayerColorCard(state, seatIndex, isDeclarer, partnerSeat, legalCards, trumpSuit, weights = BotEngine.championWeights) {
        const lead = state.currentTrick[0];
        const leadCard = lead.card;
        const leadSeat = lead.seatIndex;
        const followingSuit = legalCards.every((c) => c.suit === leadCard.suit);
        if (isDeclarer) {
            // Lead was played by a Defender. Other Defender is behind.
            if (followingSuit) {
                // Can we beat leadCard?
                const winners = legalCards.filter((c) => c.rank > leadCard.rank);
                if (winners.length > 0) {
                    // If lead card has high points (10 or Ass) or we can win cheaply, take it!
                    winners.sort((a, b) => a.rank - b.rank);
                    return winners[0].id;
                }
                // Cannot beat: discard lowest card
                legalCards.sort((a, b) => a.points - b.points || a.rank - b.rank);
                return legalCards[0].id;
            }
            // Trumping or Free card
            const trumpCards = legalCards.filter((c) => c.suit === trumpSuit);
            if (trumpCards.length > 0) {
                // Trumping: pick lowest trump
                trumpCards.sort((a, b) => a.rank - b.rank);
                return trumpCards[0].id;
            }
            // Free card: dump lowest point card
            legalCards.sort((a, b) => a.points - b.points || a.rank - b.rank);
            return legalCards[0].id;
        }
        // Defender:
        if (leadSeat === partnerSeat) {
            // Lead was played by PARTNER!
            // If partner led an Ass of a side suit or if smearAggression is high
            if ((leadCard.rank === 9 || (weights.smearAggression > 1.2 && leadCard.rank >= 7)) &&
                leadCard.suit !== trumpSuit) {
                // SCHMIEREN: If we can feed points safely, do so!
                legalCards.sort((a, b) => b.points - a.points);
                return legalCards[0].id;
            }
            // If partner led low card, try to win the trick to prevent declarer from getting it cheaply
            const highCards = legalCards.filter((c) => c.rank >= 8); // Ass or 10
            if (highCards.length > 0 && weights.secondPlayerTakeLeadAggression >= 0.8) {
                highCards.sort((a, b) => b.rank - a.rank);
                return highCards[0].id;
            }
            // Otherwise play low
            legalCards.sort((a, b) => a.points - b.points || a.rank - b.rank);
            return legalCards[0].id;
        }
        // Lead was played by DECLARER! Player behind us is PARTNER!
        // Since player behind us is our teammate, we can safely play high without fear of partner eating it!
        if (followingSuit) {
            const beatsDeclarer = legalCards.filter((c) => c.rank > leadCard.rank);
            if (beatsDeclarer.length > 0) {
                // Win with lowest card that beats declarer
                beatsDeclarer.sort((a, b) => a.rank - b.rank);
                return beatsDeclarer[0].id;
            }
            // Cannot beat: Wimmeln (give 0 points)
            legalCards.sort((a, b) => a.points - b.points || a.rank - b.rank);
            return legalCards[0].id;
        }
        // Trumpfzwang: Must play trump
        const trumps = legalCards.filter((c) => c.suit === trumpSuit);
        if (trumps.length > 0) {
            trumps.sort((a, b) => a.rank - b.rank);
            return trumps[0].id;
        }
        // Free discard: Wimmeln
        legalCards.sort((a, b) => a.points - b.points || a.rank - b.rank);
        return legalCards[0].id;
    }
    /**
     * Leading player in Color Game.
     */
    static decideLeadColorCard(state, seatIndex, isDeclarer, legalCards, trumpSuit, weights = BotEngine.championWeights) {
        const playedCards = BotEngine.getPlayedCards(state.trickHistory);
        if (isDeclarer) {
            // Declarer strategy:
            // 1. Draw Trumps: Count remaining trumps with opponents
            const myTrumps = legalCards.filter((c) => c.suit === trumpSuit);
            const playedTrumps = playedCards.filter((c) => c.suit === trumpSuit).length;
            const totalTrumpsInDeck = trumpSuit === 'SCHELL' ? 9 : 8;
            const opponentTrumpsRemaining = totalTrumpsInDeck - playedTrumps - myTrumps.length;
            if (opponentTrumpsRemaining > 0 && myTrumps.length > 0) {
                // Check if we hold the highest remaining trump
                const bossTrump = BotEngine.isBossCard(myTrumps[0], playedCards, legalCards);
                // Sort trumps descending
                myTrumps.sort((a, b) => b.rank - a.rank);
                // If we hold top trump, lead it to draw opponents' trumps!
                const thresholdRank = weights.trumpLeadTendency >= 1.2 ? 7 : 8;
                if (myTrumps[0].rank >= thresholdRank || bossTrump) {
                    return myTrumps[0].id;
                }
            }
            // 2. Cash Side Aces: Leading a side Ass guarantees 11 points + trick
            const sideAces = legalCards.filter((c) => c.suit !== trumpSuit && c.rank === 9);
            if (sideAces.length > 0) {
                return sideAces[0].id;
            }
            // 3. Lead established side boss cards (e.g. 10 if Ass is played)
            const sideBossCards = legalCards.filter((c) => c.suit !== trumpSuit && BotEngine.isBossCard(c, playedCards, legalCards));
            if (sideBossCards.length > 0) {
                sideBossCards.sort((a, b) => b.points - a.points);
                return sideBossCards[0].id;
            }
            // 4. Otherwise lead low non-trump card
            const lowNonTrumps = legalCards.filter((c) => c.suit !== trumpSuit);
            if (lowNonTrumps.length > 0) {
                lowNonTrumps.sort((a, b) => a.points - b.points || a.rank - b.rank);
                return lowNonTrumps[0].id;
            }
            // Only trumps left
            legalCards.sort((a, b) => b.rank - a.rank);
            return legalCards[0].id;
        }
        // Defender strategy:
        // 1. Cash side Aces
        const sideAces = legalCards.filter((c) => c.suit !== trumpSuit && c.rank === 9);
        if (sideAces.length > 0) {
            return sideAces[0].id;
        }
        // 2. Do NOT lead trumps (unless no choice)
        const nonTrumps = legalCards.filter((c) => c.suit !== trumpSuit);
        if (nonTrumps.length > 0) {
            // Lead low card (7, 8, 9) of an unplayed suit
            const safeLeads = nonTrumps.filter((c) => c.points === 0);
            if (safeLeads.length > 0) {
                safeLeads.sort((a, b) => a.rank - b.rank);
                return safeLeads[0].id;
            }
            nonTrumps.sort((a, b) => a.points - b.points || a.rank - b.rank);
            return nonTrumps[0].id;
        }
        // Only trumps left
        legalCards.sort((a, b) => a.rank - b.rank);
        return legalCards[0].id;
    }
    // =========================================================================
    // --- TRICK PLAY LOGIC: BETTL (MODES 9 & 11) ---
    // =========================================================================
    static decideBettlCard(state, seatIndex, isDeclarer, legalCards) {
        const trick = state.currentTrick;
        if (isDeclarer) {
            // Declarer MUST make 0 tricks!
            if (trick.length === 0) {
                // Leading: Lead lowest card, prefer long suit
                legalCards.sort((a, b) => a.rank - b.rank);
                return legalCards[0].id;
            }
            // Following: Lead suit is fixed
            const leadSuit = trick[0].card.suit;
            const maxLeadRank = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
            // Safe cards are lower than current highest card of lead suit (cannot win trick)
            const safeCards = legalCards.filter((c) => c.suit !== leadSuit || c.rank < maxLeadRank);
            if (safeCards.length > 0) {
                if (trick.length === 2) {
                    // 3rd to play: Trick already won by someone else!
                    // Safely dump highest safe card!
                    safeCards.sort((a, b) => b.rank - a.rank);
                    return safeCards[0].id;
                }
                // 2nd to play: Play lowest safe card to stay below 3rd player
                safeCards.sort((a, b) => a.rank - b.rank);
                return safeCards[0].id;
            }
            // Forced to play higher card: play lowest possible
            legalCards.sort((a, b) => a.rank - b.rank);
            return legalCards[0].id;
        }
        // Defender: Wants Declarer to WIN a trick!
        const declarerSeat = state.declarerSeat;
        const declarerPlay = trick.find((t) => t.seatIndex === declarerSeat);
        if (declarerPlay) {
            // Declarer has already played!
            const leadSuit = trick[0].card.suit;
            const decCard = declarerPlay.card;
            if (decCard.suit === leadSuit) {
                // Check if declarer is currently winning
                const highestSoFar = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
                if (decCard.rank === highestSoFar) {
                    // Declarer is WINNING! Duck under Declarer!
                    const duckCards = legalCards.filter((c) => c.suit === leadSuit && c.rank < decCard.rank);
                    if (duckCards.length > 0) {
                        // Play highest card that is STILL lower than declarer's card!
                        duckCards.sort((a, b) => b.rank - a.rank);
                        return duckCards[0].id;
                    }
                }
            }
        }
        // Declarer has not played yet or we cannot duck:
        if (trick.length === 0) {
            // Lead a low card to force declarer to play high
            legalCards.sort((a, b) => a.rank - b.rank);
            return legalCards[0].id;
        }
        legalCards.sort((a, b) => a.rank - b.rank);
        return legalCards[0].id;
    }
    // =========================================================================
    // --- TRICK PLAY LOGIC: MORD (MODES 10 & 12) ---
    // =========================================================================
    static decideMordCard(state, seatIndex, isDeclarer, legalCards) {
        if (isDeclarer) {
            // Declarer must win EVERY trick!
            // Lead master cards (highest rank)
            legalCards.sort((a, b) => b.rank - a.rank);
            return legalCards[0].id;
        }
        // Defender: Win ANY trick to defeat Mord immediately!
        const trick = state.currentTrick;
        if (trick.length > 0) {
            const leadSuit = trick[0].card.suit;
            const highestRank = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
            const winners = legalCards.filter((c) => c.suit === leadSuit && c.rank > highestRank);
            if (winners.length > 0) {
                winners.sort((a, b) => b.rank - a.rank);
                return winners[0].id;
            }
        }
        legalCards.sort((a, b) => b.rank - a.rank);
        return legalCards[0].id;
    }
    // =========================================================================
    // --- TALON 13-CARD OPTIMIZATION ---
    // =========================================================================
    static evaluate13CardHand(cards13, minMode, weights = BotEngine.championWeights) {
        // If minMode === 10: Declarer must play Mord (10)
        if (minMode === 10) {
            const weakCards = [...cards13].sort((a, b) => a.rank - b.rank);
            return {
                selectedMode: 10,
                discardedCardIds: weakCards.slice(0, 3).map((c) => c.id),
            };
        }
        // If minMode === 9: Declarer can play Bettl (9) or Mord (10)
        if (minMode === 9) {
            const aces = cards13.filter((c) => c.rank === 9).length;
            if (aces >= 3) {
                const weakCards = [...cards13].sort((a, b) => a.rank - b.rank);
                return {
                    selectedMode: 10,
                    discardedCardIds: weakCards.slice(0, 3).map((c) => c.id),
                };
            }
            const dangerousCards = [...cards13].sort((a, b) => b.rank - a.rank || b.points - a.points);
            return {
                selectedMode: 9,
                discardedCardIds: dangerousCards.slice(0, 3).map((c) => c.id),
            };
        }
        // minMode <= 8: Declarer can choose between Color games (>= minMode), Bettl (9), or Mord (10)
        // 1. Check Bettl (Mode 9)
        const dangerousCards = [...cards13].sort((a, b) => b.rank - a.rank || b.points - a.points);
        const bettlDiscards = dangerousCards.slice(0, 3);
        const remBettl10 = cards13.filter((c) => !bettlDiscards.some((d) => d.id === c.id));
        const evalBettl = BotEngine.evaluateHand(remBettl10, weights);
        if (evalBettl.canDoppelbettl) {
            return {
                selectedMode: 9,
                discardedCardIds: bettlDiscards.map((c) => c.id),
            };
        }
        // 2. Check Mord (Mode 10)
        const weakCards = [...cards13].sort((a, b) => a.rank - b.rank);
        const mordDiscards = weakCards.slice(0, 3);
        const remMord10 = cards13.filter((c) => !mordDiscards.some((d) => d.id === c.id));
        const evalMord = BotEngine.evaluateHand(remMord10, weights);
        if (evalMord.canDoppelmord) {
            return {
                selectedMode: 10,
                discardedCardIds: mordDiscards.map((c) => c.id),
            };
        }
        // 3. Color Games: Evaluate best suit among 5..8 >= minMode
        const suits = [
            { suit: 'EICHEL', mode: 5 },
            { suit: 'LAUB', mode: 6 },
            { suit: 'SCHELL', mode: 7 },
            { suit: 'HERZ', mode: 8 },
        ];
        const candidateSuits = suits.filter((s) => s.mode >= minMode);
        if (candidateSuits.length === 0) {
            // Fallback: Default to highest available color mode or minMode
            candidateSuits.push({ suit: 'HERZ', mode: Math.max(5, Math.min(8, minMode)) });
        }
        let bestSuit = candidateSuits[0].suit;
        let bestMode = candidateSuits[0].mode;
        let bestScore = -1;
        let bestDiscards = [];
        for (const cand of candidateSuits) {
            const trumpCards = cards13.filter((c) => c.suit === cand.suit);
            const nonTrumpCards = cards13.filter((c) => c.suit !== cand.suit);
            const nonTrumpGrouped = {
                EICHEL: [],
                LAUB: [],
                SCHELL: [],
                HERZ: [],
            };
            for (const c of nonTrumpCards) {
                nonTrumpGrouped[c.suit].push(c);
            }
            // Sort non-trump cards by discard desirability:
            // Priority 1: Keep side Aces!
            // Priority 2: Bank unsafe 10s (10 without Ace)
            // Priority 3: Bank high points safely
            // Priority 4: Void short suits
            const scoredDiscards = [...nonTrumpCards].sort((a, b) => {
                const aIsAce = a.rank === 9 ? 1 : 0;
                const bIsAce = b.rank === 9 ? 1 : 0;
                if (aIsAce !== bIsAce)
                    return aIsAce - bIsAce; // Keep Aces!
                const aSuitHasAce = nonTrumpGrouped[a.suit].some((c) => c.rank === 9);
                const bSuitHasAce = nonTrumpGrouped[b.suit].some((c) => c.rank === 9);
                const aUnsafe10 = a.rank === 8 && !aSuitHasAce ? 1 : 0;
                const bUnsafe10 = b.rank === 8 && !bSuitHasAce ? 1 : 0;
                if (aUnsafe10 !== bUnsafe10)
                    return bUnsafe10 - aUnsafe10;
                if (a.points !== b.points)
                    return b.points - a.points;
                const aSuitLen = nonTrumpGrouped[a.suit].length;
                const bSuitLen = nonTrumpGrouped[b.suit].length;
                if (aSuitLen !== bSuitLen)
                    return aSuitLen - bSuitLen;
                return a.rank - b.rank;
            });
            const chosenDiscards = scoredDiscards.slice(0, 3);
            if (chosenDiscards.length < 3) {
                const trumpsSorted = [...trumpCards].sort((a, b) => a.rank - b.rank);
                while (chosenDiscards.length < 3 && trumpsSorted.length > 0) {
                    chosenDiscards.push(trumpsSorted.shift());
                }
            }
            // Guarantee exactly 3 discards
            while (chosenDiscards.length < 3) {
                const remaining = cards13.filter((c) => !chosenDiscards.some((d) => d.id === c.id));
                if (remaining.length === 0)
                    break;
                chosenDiscards.push(remaining[0]);
            }
            const bankedPoints = chosenDiscards.reduce((sum, c) => sum + c.points, 0);
            const trumpPower = trumpCards.length * 6 +
                (trumpCards.some((c) => c.rank === 9) ? 10 : 0) +
                (trumpCards.some((c) => c.rank === 8) ? 8 : 0) +
                bankedPoints;
            if (trumpPower > bestScore) {
                bestScore = trumpPower;
                bestSuit = cand.suit;
                bestMode = cand.mode;
                bestDiscards = chosenDiscards;
            }
        }
        return {
            selectedMode: bestMode,
            discardedCardIds: bestDiscards.map((c) => c.id),
        };
    }
    // =========================================================================
    // --- HAND EVALUATION & BIDDING HELPER ---
    // =========================================================================
    static evaluateHand(hand, weights = BotEngine.championWeights) {
        const suits = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
        const suitAnalyses = {};
        const suitToMode = {
            EICHEL: 5,
            LAUB: 6,
            SCHELL: 7,
            HERZ: 8,
        };
        let bestTrumpSuit = 'EICHEL';
        let bestTrumpMode = 5;
        let bestTrumpPower = -1;
        for (const suit of suits) {
            const cards = hand.filter((c) => c.suit === suit);
            const points = cards.reduce((sum, c) => sum + c.points, 0);
            const hasAss = cards.some((c) => c.rank === 9);
            const has10 = cards.some((c) => c.rank === 8);
            const hasKing = cards.some((c) => c.rank === 7);
            const hasOber = cards.some((c) => c.rank === 6);
            const hasUnter = cards.some((c) => c.rank === 5);
            // Power calculation: length + honors + points
            const powerScore = cards.length * 5 +
                (hasAss ? 9 : 0) +
                (has10 ? 7 : 0) +
                (hasKing ? 3 : 0) +
                points / 3;
            suitAnalyses[suit] = {
                suit,
                count: cards.length,
                points,
                hasAss,
                has10,
                hasKing,
                hasOber,
                hasUnter,
                cards,
                powerScore,
            };
            if (powerScore > bestTrumpPower) {
                bestTrumpPower = powerScore;
                bestTrumpSuit = suit;
                bestTrumpMode = suitToMode[suit];
            }
        }
        // Bettl evaluation:
        // Safe cards: rank <= 4 (7, 8, 9, Weli) or protected Unter
        // Dangerous cards: Ass (9), 10er (8), King (7), or single Ober (6)
        const dangerousCards = hand.filter((c) => {
            if (c.rank >= 7)
                return true;
            const count = suitAnalyses[c.suit].count;
            if (c.rank === 6 && count <= 2)
                return true;
            return false;
        });
        const canDoppelbettl = hand.every((c) => c.rank <= 6) &&
            hand.filter((c) => c.rank >= 5).every((c) => suitAnalyses[c.suit].count >= 3);
        // Bettl with Talon allows discarding up to weights.bettlMaxDangerousCards dangerous cards
        const canBettl = dangerousCards.length <= weights.bettlMaxDangerousCards &&
            hand.filter((c) => c.rank <= 4).length >= weights.bettlMinLowCards;
        // Mord evaluation:
        const acesCount = hand.filter((c) => c.rank === 9).length;
        const tensCount = hand.filter((c) => c.rank === 8).length;
        const mastersCount = hand.filter((c) => c.rank >= 8).length;
        const canDoppelmord = acesCount >= Math.max(3, weights.mordMinAces + 1) &&
            mastersCount >= Math.max(7, weights.mordMinMasters + 2);
        const canMord = acesCount >= weights.mordMinAces && mastersCount >= weights.mordMinMasters;
        // Determine viable modes
        const viableModes = new Set();
        // Color games viable threshold
        for (const [suit, analysis] of Object.entries(suitAnalyses)) {
            const mode = suitToMode[suit];
            // Viable color game based on weights:
            if (analysis.count >= weights.colorGameMinTrumpCount &&
                (analysis.hasAss || analysis.has10 || analysis.powerScore >= weights.colorGameMinPower + 4) &&
                analysis.powerScore >= weights.colorGameMinPower) {
                viableModes.add(mode);
            }
        }
        if (canBettl)
            viableModes.add(9);
        if (canMord)
            viableModes.add(10);
        if (canDoppelbettl)
            viableModes.add(11);
        if (canDoppelmord)
            viableModes.add(12);
        let maxViableBid = 0;
        if (viableModes.size > 0) {
            maxViableBid = Math.max(4, ...Array.from(viableModes));
        }
        return {
            suitAnalyses,
            bestTrumpSuit,
            bestTrumpMode,
            bestTrumpPower,
            canBettl,
            canDoppelbettl,
            canMord,
            canDoppelmord,
            viableModes,
            maxViableBid,
        };
    }
    /**
     * Checks whether the player can legally and sensibly play at or above the given bid.
     */
    static canPlayAtLeast(evaluations, targetBid) {
        if (targetBid <= 4)
            return evaluations.maxViableBid >= 4;
        // Target bid 5: Can play Eichel (5) or higher
        if (targetBid === 5) {
            return (evaluations.viableModes.has(5) ||
                evaluations.viableModes.has(6) ||
                evaluations.viableModes.has(7) ||
                evaluations.viableModes.has(8) ||
                evaluations.viableModes.has(9) ||
                evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 6: Can play Laub (6) or higher
        if (targetBid === 6) {
            return (evaluations.viableModes.has(6) ||
                evaluations.viableModes.has(7) ||
                evaluations.viableModes.has(8) ||
                evaluations.viableModes.has(9) ||
                evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 7: Can play Schell (7) or higher
        if (targetBid === 7) {
            return (evaluations.viableModes.has(7) ||
                evaluations.viableModes.has(8) ||
                evaluations.viableModes.has(9) ||
                evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 8: Can play Herz (8) or higher
        if (targetBid === 8) {
            return (evaluations.viableModes.has(8) ||
                evaluations.viableModes.has(9) ||
                evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 9: Bettl or higher
        if (targetBid === 9) {
            return (evaluations.viableModes.has(9) ||
                evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 10: Mord or higher
        if (targetBid === 10) {
            return (evaluations.viableModes.has(10) ||
                evaluations.viableModes.has(11) ||
                evaluations.viableModes.has(12));
        }
        // Target bid 11: Doppelbettl or higher
        if (targetBid === 11) {
            return evaluations.viableModes.has(11) || evaluations.viableModes.has(12);
        }
        // Target bid 12: Doppelmord
        if (targetBid === 12) {
            return evaluations.viableModes.has(12);
        }
        return false;
    }
    // =========================================================================
    // --- CARD MEMORY HELPERS ---
    // =========================================================================
    static getPlayedCards(trickHistory) {
        const list = [];
        for (const t of trickHistory) {
            for (const item of t.cards) {
                list.push(item.card);
            }
        }
        return list;
    }
    /**
     * Checks whether the given card is currently the highest remaining card in its suit.
     */
    static isBossCard(card, playedCards, myHand) {
        // If rank is 9 (Ass), it's always the boss card
        if (card.rank === 9)
            return true;
        // Check if any higher card of the same suit is still unaccounted for
        for (let r = (card.rank + 1); r <= 9; r++) {
            const higherPlayed = playedCards.some((c) => c.suit === card.suit && c.rank === r);
            const higherInHand = myHand.some((c) => c.suit === card.suit && c.rank === r);
            if (!higherPlayed && !higherInHand) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=BotEngine.js.map