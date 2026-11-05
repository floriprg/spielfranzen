import { GAME_MODE_INFO, } from '@spielfranzen/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeck } from './deck.js';
import { GameEngine } from './GameEngine.js';
import { getLegalCardIds } from './sanitizer.js';
import { ISMCTSEngine } from './ISMCTS.js';
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
    vacuumBonusMultiplier: 0.8,
    bettlDangerThreshold: 18,
    doppelbettlDangerThreshold: 8,
    mordMaxStopperHoles: 0,
    explorationTemperature: 3.0,
    useISMCTS: true,
    ismctsIterations: 100,
    ismctsExploration: 0.75,
    useNeuralNetwork: true,
    neuralNetworkWeight: 80,
};
// 33 Canonical Card IDs for RL State Encoding
export const RL_CARD_IDS = [
    // Eichel (0..7)
    'EICHEL_2', 'EICHEL_3', 'EICHEL_4', 'EICHEL_5', 'EICHEL_6', 'EICHEL_7', 'EICHEL_8', 'EICHEL_9',
    // Laub (8..15)
    'LAUB_2', 'LAUB_3', 'LAUB_4', 'LAUB_5', 'LAUB_6', 'LAUB_7', 'LAUB_8', 'LAUB_9',
    // Herz (16..23)
    'HERZ_2', 'HERZ_3', 'HERZ_4', 'HERZ_5', 'HERZ_6', 'HERZ_7', 'HERZ_8', 'HERZ_9',
    // Schell (24..31)
    'SCHELL_2', 'SCHELL_3', 'SCHELL_4', 'SCHELL_5', 'SCHELL_6', 'SCHELL_7', 'SCHELL_8', 'SCHELL_9',
    // Weli (32)
    'SCHELL_WELI',
];
export const RL_CARD_TO_INDEX = {};
RL_CARD_IDS.forEach((id, idx) => {
    RL_CARD_TO_INDEX[id] = idx;
});
/**
 * Encodes the current match state into the exact 147-float input vector expected by FranzenActorCritic:
 * - 0–32: Player hand cards (One-Hot, 33)
 * - 33–65: Already played cards in previous tricks (One-Hot, 33)
 * - 66–98: First card in current trick (One-Hot, 33)
 * - 99–131: Second card in current trick (One-Hot, 33)
 * - 132–140: Current game mode 4 to 12 (One-Hot, 9)
 * - 141–146: Normalized values [eigenePkt/66, gegnerPkt/66, stichNr/10, istAlleinspieler, posImStich/2, trumpfIdx/4]
 */
export function encodeGameStateTo147Floats(state, seatIndex) {
    const vec = new Float32Array(147);
    // 1. Hand cards
    const myHand = state.hands[seatIndex] || [];
    for (const card of myHand) {
        const idx = RL_CARD_TO_INDEX[card.id];
        if (idx !== undefined) {
            vec[idx] = 1.0;
        }
    }
    // 2. Played cards in previous tricks
    for (const trick of state.trickHistory) {
        for (const play of trick.cards) {
            const idx = RL_CARD_TO_INDEX[play.card.id];
            if (idx !== undefined) {
                vec[33 + idx] = 1.0;
            }
        }
    }
    // 3. First card in current trick
    if (state.currentTrick.length >= 1) {
        const leadCard = state.currentTrick[0].card;
        const idx = RL_CARD_TO_INDEX[leadCard.id];
        if (idx !== undefined) {
            vec[66 + idx] = 1.0;
        }
    }
    // 4. Second card in current trick
    if (state.currentTrick.length >= 2) {
        const secondCard = state.currentTrick[1].card;
        const idx = RL_CARD_TO_INDEX[secondCard.id];
        if (idx !== undefined) {
            vec[99 + idx] = 1.0;
        }
    }
    // 5. Game Mode (4 to 12)
    const mode = state.gameMode || 5;
    const modeIdx = Math.max(0, Math.min(8, mode - 4));
    vec[132 + modeIdx] = 1.0;
    // 6. Normalized Floats
    const isDeclarer = seatIndex === state.declarerSeat;
    const eigenePunkte = isDeclarer ? state.declarerCardPoints : state.defenderCardPoints;
    const gegnerPunkte = isDeclarer ? state.defenderCardPoints : state.declarerCardPoints;
    vec[141] = eigenePunkte / 66.0;
    vec[142] = gegnerPunkte / 66.0;
    vec[143] = state.trickHistory.length / 10.0;
    vec[144] = isDeclarer ? 1.0 : 0.0;
    vec[145] = state.currentTrick.length / 2.0;
    // Trumpf-Farbe-Index: Eichel=0, Laub=1, Schell=3, Herz=2, Kein Trumpf=4
    const TRUMP_SUIT_INDEX = {
        5: 0, // EICHEL
        6: 1, // LAUB
        7: 3, // SCHELL
        8: 2, // HERZ
    };
    const trumpIdx = TRUMP_SUIT_INDEX[mode] !== undefined ? TRUMP_SUIT_INDEX[mode] : 4;
    vec[146] = trumpIdx / 4.0;
    return vec;
}
export class BotEngine {
    static championWeights = BotEngine.loadChampionWeights();
    static onnxSession = null;
    static onnxInitAttempted = false;
    /**
     * Initializes and warms up the ONNX runtime inference session.
     * Automatically picks the newest trained model based on file modification timestamp.
     */
    static async initNeuralNetwork(forceReload = false) {
        if (BotEngine.onnxSession && !forceReload)
            return true;
        try {
            const ort = await import('onnxruntime-node');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const candidatePaths = [
                path.resolve(process.cwd(), 'franzen_bot.onnx'),
                path.resolve(__dirname, '../../../franzen_bot.onnx'),
                path.resolve(__dirname, '../config/franzen_bot.onnx'),
                path.resolve(process.cwd(), 'backend/src/config/franzen_bot.onnx'),
            ].filter((p) => fs.existsSync(p));
            if (candidatePaths.length === 0) {
                console.warn('⚠️ [BotEngine] franzen_bot.onnx not found. Falling back to ISMCTS/Heuristics.');
                return false;
            }
            // Sort by newest modification timestamp
            candidatePaths.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
            const modelPath = candidatePaths[0];
            const stats = fs.statSync(modelPath);
            BotEngine.onnxSession = await ort.InferenceSession.create(modelPath);
            console.log(`🧠 [BotEngine] Franzen RL Neural Network (ONNX) loaded from: ${modelPath} (Stand: ${new Date(stats.mtime).toLocaleString()})`);
            return true;
        }
        catch (err) {
            console.warn('⚠️ [BotEngine] Failed to initialize ONNX neural network:', err);
            return false;
        }
    }
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
    static getModeBasePoints(mode) {
        if (mode >= 5 && mode <= 8)
            return 100;
        if (mode === 9)
            return 200;
        if (mode === 10)
            return 300;
        if (mode === 11)
            return 400;
        if (mode === 12)
            return 600;
        return 100;
    }
    /**
     * Generates all 286 combinations of choosing 3 cards to discard out of 13.
     * C(13, 3) = (13 * 12 * 11) / 6 = 286 combinations.
     */
    static getCombinations13Choose3(cards13) {
        const result = [];
        const n = cards13.length;
        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                for (let k = j + 1; k < n; k++) {
                    const discard3 = [cards13[i], cards13[j], cards13[k]];
                    const keep10 = cards13.filter((_, idx) => idx !== i && idx !== j && idx !== k);
                    result.push([keep10, discard3]);
                }
            }
        }
        return result;
    }
    /**
     * Non-deterministic move selection using Boltzmann Softmax distribution over candidate scores.
     * Allows bots to explore variations while heavily preferring the mathematically optimal move.
     */
    static sampleMoveWithTemperature(candidates, temperature = 3.0) {
        if (candidates.length === 0)
            throw new Error('No candidates to sample');
        if (candidates.length === 1)
            return candidates[0].cardId;
        // Purely deterministic if temperature is negligible
        if (temperature <= 0.01) {
            candidates.sort((a, b) => b.score - a.score);
            return candidates[0].cardId;
        }
        const maxScore = Math.max(...candidates.map((c) => c.score));
        const expScores = candidates.map((c) => ({
            cardId: c.cardId,
            weight: Math.exp(Math.min(50, Math.max(-50, (c.score - maxScore) / temperature))),
        }));
        const totalWeight = expScores.reduce((sum, c) => sum + c.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const c of expScores) {
            rand -= c.weight;
            if (rand <= 0)
                return c.cardId;
        }
        return candidates[0].cardId;
    }
    // =========================================================================
    // --- MATHEMATICAL EVALUATION FUNCTIONS (PDF SECTION 7.2) ---
    // =========================================================================
    /**
     * Color Game Score S_Trumpf(Hand, Farbe) & Win Probability:
     * - Trump card weight: 12 + rank * 1.5
     * - Off-suit Ace: +14
     * - Off-suit protected 10 (has Ace or >= 2 cards in suit): +9
     * - Off-suit void (0 cards) with >= 4 trumps: +8
     * - Vakuum-Check: >= 6 trumps & hand eyes < 25 => +0.8 * P_Talon for discarded points!
     */
    static calculateColorScore(hand10, discard3, trumpSuit, weights = BotEngine.championWeights) {
        const trumps = hand10.filter((c) => c.suit === trumpSuit);
        const nonTrumps = hand10.filter((c) => c.suit !== trumpSuit);
        let score = 0;
        // 1. Trump base weights
        for (const t of trumps) {
            score += 12 + t.rank * 1.5;
        }
        // Additional trump bonus from weights
        score += (trumps.length - 4) * (weights.colorGameMinPower ? 2.0 : 1.0);
        // Penalty for discarding trumps in a color game (preserve trumps!)
        const discardedTrumps = discard3.filter((c) => c.suit === trumpSuit).length;
        score -= discardedTrumps * 35 * (weights.discardTrumpRetention || 2.0);
        // 2. Off-suit analysis
        const suits = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
        const offSuits = suits.filter((s) => s !== trumpSuit);
        for (const s of offSuits) {
            const suitCards = nonTrumps.filter((c) => c.suit === s);
            const hasAce = suitCards.some((c) => c.rank === 9);
            const has10 = suitCards.some((c) => c.rank === 8);
            if (hasAce) {
                score += 14;
            }
            if (has10 && (hasAce || suitCards.length >= 3)) {
                score += 9;
            }
            if (suitCards.length === 0 && trumps.length >= (weights.colorGameMinTrumpCount || 4)) {
                score += (weights.discardBlankSuitBonus ? weights.discardBlankSuitBonus * 0.4 : 8);
            }
        }
        // 3. Sonder-Heuristik "Vakuum-Check" (PDF Section 3 & 7.2)
        // If bot has >= 6 trumps (incl. Ace or 10er) but few hand points (< 25),
        // reward dumping high points into the talon to expand the vacuum interval!
        const handPoints = hand10.reduce((sum, c) => sum + c.points, 0);
        const hasHighTrump = trumps.some((c) => c.rank >= 8);
        if (trumps.length >= 6 && hasHighTrump && handPoints < 25 && discard3.length === 3) {
            const pTalon = discard3.reduce((sum, c) => sum + c.points, 0);
            const multiplier = weights.vacuumBonusMultiplier ?? 0.8;
            score += multiplier * pTalon;
        }
        return score;
    }
    static calculateColorWinProb(hand10, discard3, trumpSuit, weights = BotEngine.championWeights) {
        const score = BotEngine.calculateColorScore(hand10, discard3, trumpSuit, weights);
        // Baseline score of 54 corresponds to ~50% win probability
        const winProb = 1 / (1 + Math.exp(-0.065 * (score - 54)));
        return Math.max(0.001, Math.min(0.999, winProb));
    }
    /**
     * Bettl Danger Index D_Bettl(Hand) (PDF Section 4 & 7.2):
     * For each suit:
     * - 0 cards or {Weli, 7} => D_Farbe = 0
     * - Lowest card c[0]: D_Farbe += lowerMissing(c[0]) * 9 - (k - 1) * 4
     * - Higher cards c[i]: if missing lower > buffer => danger increases
     * Bettl viable if sum(D_Farbe) < 18 (Doppelbettl < 8).
     */
    static calculateBettlDanger(hand10, weights = BotEngine.championWeights) {
        const suits = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
        let totalDanger = 0;
        for (const suit of suits) {
            const cardsInSuit = hand10.filter((c) => c.suit === suit).sort((a, b) => a.rank - b.rank);
            const k = cardsInSuit.length;
            if (k === 0)
                continue; // Void is 100% immune (D = 0)
            // If only Weli or Schell 7
            if (suit === 'SCHELL' && k === 1 && cardsInSuit[0].rank === 1) {
                continue; // Weli alone is rank 1, 0 danger!
            }
            if (k === 1 && cardsInSuit[0].rank === 2 && suit !== 'SCHELL') {
                continue; // 7er alone in regular suit cannot be undercut!
            }
            // Lowest card
            const c0 = cardsInSuit[0];
            let lowerCardsPossible = 0;
            if (suit === 'SCHELL') {
                // Schell has ranks 1 (Weli), 2 (7), 3 (8), ...
                if (c0.rank === 1)
                    lowerCardsPossible = 0;
                else if (c0.rank === 2)
                    lowerCardsPossible = 1; // only Weli below
                else
                    lowerCardsPossible = c0.rank - 1;
            }
            else {
                // Standard suits have ranks 2 (7), 3 (8), 4 (9), ...
                lowerCardsPossible = Math.max(0, c0.rank - 2);
            }
            const lowerInHand = cardsInSuit.filter((c) => c.rank < c0.rank).length;
            const lowerMissing = Math.max(0, lowerCardsPossible - lowerInHand);
            let dFarbe = Math.max(0, lowerMissing * 9 - (k - 1) * 4);
            // Check subsequent cards if buffer is insufficient
            for (let i = 1; i < k; i++) {
                const ci = cardsInSuit[i];
                let lowerTotal = 0;
                if (suit === 'SCHELL') {
                    lowerTotal = ci.rank === 1 ? 0 : ci.rank === 2 ? 1 : ci.rank - 1;
                }
                else {
                    lowerTotal = Math.max(0, ci.rank - 2);
                }
                const lowerOwned = cardsInSuit.filter((c) => c.rank < ci.rank).length;
                const missing = Math.max(0, lowerTotal - lowerOwned);
                const buffer = Math.max(0, k - 1 - i);
                if (missing > buffer) {
                    dFarbe += (missing - buffer) * 6;
                }
            }
            totalDanger += dFarbe;
        }
        return totalDanger;
    }
    static calculateBettlWinProb(hand10, weights = BotEngine.championWeights) {
        const danger = BotEngine.calculateBettlDanger(hand10, weights);
        const threshold = weights.bettlDangerThreshold ?? 18;
        // Sigmoid centered around threshold - 3
        const winProb = 1 / (1 + Math.exp(0.24 * (danger - (threshold - 3))));
        return Math.max(0.01, Math.min(0.99, winProb));
    }
    static calculateDoppelbettlWinProb(hand10, weights = BotEngine.championWeights) {
        const danger = BotEngine.calculateBettlDanger(hand10, weights);
        const threshold = weights.doppelbettlDangerThreshold ?? 8;
        const winProb = 1 / (1 + Math.exp(0.35 * (danger - (threshold - 2))));
        return Math.max(0.01, Math.min(0.99, winProb));
    }
    /**
     * Mord Control Check M_Mord(Hand) (PDF Section 6 & 7.2):
     * Checks unbroken top-down chains in each suit and stopper holes.
     */
    static calculateMordProbability(hand10, weights = BotEngine.championWeights) {
        const suits = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
        let stopperHoles = 0;
        let topSafeTricks = 0;
        for (const suit of suits) {
            const cardsInSuit = hand10.filter((c) => c.suit === suit).sort((a, b) => b.rank - a.rank);
            if (cardsInSuit.length === 0)
                continue;
            // Top card must be Ass (rank 9)
            if (cardsInSuit[0].rank !== 9) {
                stopperHoles++;
                continue;
            }
            topSafeTricks++;
            let expectedRank = 8; // Expect 10er next
            for (let i = 1; i < cardsInSuit.length; i++) {
                if (cardsInSuit[i].rank === expectedRank) {
                    topSafeTricks++;
                    expectedRank--;
                }
                else {
                    // Break in sequence before rest of suit
                    stopperHoles++;
                    break;
                }
            }
        }
        if (stopperHoles === 0 && topSafeTricks >= 6) {
            return 0.96;
        }
        // Zwei-Farben-Squeeze (PDF Section 6.1): 1 stopper hole with >= 8 top tricks
        if (stopperHoles <= (weights.mordMaxStopperHoles ?? 1) && topSafeTricks >= 8) {
            return 0.65;
        }
        return 0.05;
    }
    static calculateDoppelmordWinProb(hand10, weights = BotEngine.championWeights) {
        const prob = BotEngine.calculateMordProbability(hand10, weights);
        return prob >= 0.9 ? 0.98 : 0.02;
    }
    /**
     * Win probability estimator across any mode (5..12).
     */
    static estimateWinProbability(keep10, discard3, mode, weights = BotEngine.championWeights) {
        if (mode >= 5 && mode <= 8) {
            const trumpSuit = GAME_MODE_INFO[mode]?.trumpSuit;
            return BotEngine.calculateColorWinProb(keep10, discard3, trumpSuit, weights);
        }
        if (mode === 9) {
            return BotEngine.calculateBettlWinProb(keep10, weights);
        }
        if (mode === 10) {
            return BotEngine.calculateMordProbability(keep10, weights);
        }
        if (mode === 11) {
            return BotEngine.calculateDoppelbettlWinProb(keep10, weights);
        }
        if (mode === 12) {
            return BotEngine.calculateDoppelmordWinProb(keep10, weights);
        }
        return 0.1;
    }
    // =========================================================================
    // --- EXACT 286 TALON COMBINATIONS OPTIMIZATION (PDF SECTION 7.1) ---
    // =========================================================================
    static selectOptimalTalonAndMode(cards13, minMode, weights = BotEngine.championWeights) {
        const combinations = BotEngine.getCombinations13Choose3(cards13);
        let bestExpectedPoints = -Infinity;
        let bestMode = Math.max(5, minMode);
        let bestDiscards = combinations[0][1];
        for (const [keep10, discard3] of combinations) {
            for (let mode = Math.max(5, minMode); mode <= 10; mode++) {
                const winProb = BotEngine.estimateWinProbability(keep10, discard3, mode, weights);
                const baseValue = BotEngine.getModeBasePoints(mode);
                const expectedPoints = winProb * baseValue - (1 - winProb) * baseValue;
                if (expectedPoints > bestExpectedPoints) {
                    bestExpectedPoints = expectedPoints;
                    bestMode = mode;
                    bestDiscards = discard3;
                }
            }
        }
        return {
            selectedMode: bestMode,
            discardedCardIds: bestDiscards.map((c) => c.id),
        };
    }
    // =========================================================================
    // --- REAL-TIME DEDUCTION ENGINE (PDF SECTION 7.3) ---
    // =========================================================================
    /**
     * Tracks unseen cards and deduces which seats are void in which suits.
     * Leverages strict Trumpfzwang inference: if a player failed to follow suit
     * AND did not trump in a color game, they are definitely void in trumps too!
     */
    static deduceGameState(state, seatIndex) {
        const isVoid = {
            0: { EICHEL: false, LAUB: false, SCHELL: false, HERZ: false },
            1: { EICHEL: false, LAUB: false, SCHELL: false, HERZ: false },
            2: { EICHEL: false, LAUB: false, SCHELL: false, HERZ: false },
        };
        const myHand = state.hands[seatIndex] || [];
        const playedCardIds = new Set();
        const isColorGame = state.gameMode && state.gameMode >= 5 && state.gameMode <= 8;
        const trumpSuit = isColorGame ? GAME_MODE_INFO[state.gameMode]?.trumpSuit : undefined;
        const allTricks = [...state.trickHistory];
        if (state.currentTrick && state.currentTrick.length > 0) {
            allTricks.push({
                trickNumber: state.trickHistory.length + 1,
                leadSeat: state.trickLeadSeat,
                cards: [...state.currentTrick],
                points: 0,
            });
        }
        for (const trick of allTricks) {
            if (trick.cards.length === 0)
                continue;
            const leadSuit = trick.cards[0].card.suit;
            for (let i = 0; i < trick.cards.length; i++) {
                const play = trick.cards[i];
                playedCardIds.add(play.card.id);
                if (i > 0 && play.card.suit !== leadSuit) {
                    // Did not follow lead suit: void in leadSuit!
                    isVoid[play.seatIndex][leadSuit] = true;
                    // Trumpfzwang deduction (PDF page 10):
                    // In color game, if player did not follow leadSuit AND did not trump,
                    // they are also 100% void in trumps!
                    if (isColorGame && trumpSuit && play.card.suit !== trumpSuit) {
                        isVoid[play.seatIndex][trumpSuit] = true;
                    }
                }
            }
        }
        // Include discarded cards if bot is declarer
        const knownIds = new Set(playedCardIds);
        for (const c of myHand)
            knownIds.add(c.id);
        if (seatIndex === state.declarerSeat && state.discardedCards) {
            for (const c of state.discardedCards)
                knownIds.add(c.id);
        }
        const deck = createDeck();
        const unseenCards = deck.filter((c) => !knownIds.has(c.id));
        return { unseenCards, isVoid };
    }
    // =========================================================================
    // --- BIDDING DECISION WITH FUNDAMENTAL INEQUALITY (PDF SECTION 5) ---
    // =========================================================================
    static decideBidAction(state, seatIndex, weights = BotEngine.championWeights) {
        const hand = state.hands[seatIndex];
        const { biddingState } = state;
        const evaluation = BotEngine.evaluateHand(hand, weights);
        if (biddingState.phase === 'OPENING') {
            // Opening: isolate opening threshold (p > 50% according to PDF Gleichung 35)
            // Jitter for non-deterministic AI exploration:
            const jitter = (Math.random() - 0.5) * 0.04;
            if (evaluation.bestExpectedValue > 0 || evaluation.maxViableBid >= 4) {
                return { action: 'open', bidValue: 4 };
            }
            return { action: 'pass' };
        }
        if (biddingState.phase === 'DUEL') {
            const { holderSeat, challengerSeat, currentBid } = biddingState;
            // Challenger turn: wants to raise to currentBid + 1
            if (seatIndex === challengerSeat) {
                const nextBid = currentBid + 1;
                if (nextBid <= 12 && BotEngine.canPlayAtLeast(evaluation, nextBid)) {
                    return { action: 'raise', bidValue: nextBid };
                }
                return { action: 'pass' };
            }
            // Holder turn: can hold currentBid or pass
            if (seatIndex === holderSeat) {
                if (BotEngine.canPlayAtLeast(evaluation, currentBid)) {
                    return { action: 'hold', bidValue: currentBid };
                }
                return { action: 'pass' };
            }
        }
        return { action: 'pass' };
    }
    // =========================================================================
    // --- TALON DECISION (PDF SECTION 3 & 7.1) ---
    // =========================================================================
    static decideTalonAction(state, seatIndex, weights = BotEngine.championWeights) {
        const minMode = state.minMode || 5;
        const hand10 = state.hands[seatIndex];
        // Mandatory Handspiel when bidding reached 11 or 12
        if (minMode >= 11) {
            const p12 = BotEngine.calculateDoppelmordWinProb(hand10, weights);
            const selected = minMode === 12 || p12 >= 0.8 ? 12 : 11;
            return { action: 'declare_hand', selectedMode: selected };
        }
        // Check if initial 10 cards are already a safe Handspiel without talon (p >= 0.90)
        const pDoppelmord = BotEngine.calculateDoppelmordWinProb(hand10, weights);
        if (pDoppelmord >= 0.9 && minMode <= 12) {
            return { action: 'declare_hand', selectedMode: 12 };
        }
        const pDoppelbettl = BotEngine.calculateDoppelbettlWinProb(hand10, weights);
        if (pDoppelbettl >= 0.88 && minMode <= 11) {
            return { action: 'declare_hand', selectedMode: 11 };
        }
        // Take talon and optimize across all 286 combinations
        const full13 = [...hand10, ...state.talon];
        const bestChoice = BotEngine.selectOptimalTalonAndMode(full13, minMode, weights);
        return {
            action: 'take_talon',
            discardedCardIds: bestChoice.discardedCardIds,
            selectedMode: bestChoice.selectedMode,
        };
    }
    // =========================================================================
    // --- TRICK PLAY DECISION MATRIX (DEEP RL & HEURISTICS) ---
    // =========================================================================
    /**
     * Computes masked Softmax policy distribution (priors) over legal cards using the ONNX model.
     * Returns a map of cardId -> probability (summing to 1.0).
     */
    static async getNeuralNetworkPriors(state, seatIndex, legalCardIds) {
        if (!BotEngine.onnxSession && !BotEngine.onnxInitAttempted) {
            BotEngine.onnxInitAttempted = true;
            await BotEngine.initNeuralNetwork();
        }
        if (!BotEngine.onnxSession) {
            return null;
        }
        try {
            const ort = await import('onnxruntime-node');
            const inputVector = encodeGameStateTo147Floats(state, seatIndex);
            const inputTensor = new ort.Tensor('float32', inputVector, [1, 147]);
            const results = await BotEngine.onnxSession.run({ input: inputTensor });
            const logitsTensor = results.logits;
            if (!logitsTensor || !logitsTensor.data) {
                return null;
            }
            const logitsData = logitsTensor.data;
            // Extract legal logits and compute numerically stable Softmax
            let maxLogit = -Infinity;
            const rawLogits = [];
            for (const cardId of legalCardIds) {
                const cardIdx = RL_CARD_TO_INDEX[cardId];
                const logit = cardIdx !== undefined ? logitsData[cardIdx] : -100;
                rawLogits.push(logit);
                if (logit > maxLogit) {
                    maxLogit = logit;
                }
            }
            let sumExp = 0;
            const expValues = rawLogits.map((l) => {
                const exp = Math.exp(l - maxLogit);
                sumExp += exp;
                return exp;
            });
            const priors = new Map();
            legalCardIds.forEach((cardId, i) => {
                priors.set(cardId, sumExp > 0 ? expValues[i] / sumExp : 1.0 / legalCardIds.length);
            });
            return priors;
        }
        catch (err) {
            console.warn('⚠️ [BotEngine] Neural network inference error, falling back:', err);
            return null;
        }
    }
    /**
     * Evaluates the current state using the trained Actor-Critic Neural Network (ONNX).
     * Masks illegal actions and returns the highest logit legal card ID.
     */
    static async decideCardWithNeuralNetwork(state, seatIndex, legalCardIds, weights = BotEngine.championWeights) {
        const priors = await BotEngine.getNeuralNetworkPriors(state, seatIndex, legalCardIds);
        if (!priors)
            return null;
        let bestCard = legalCardIds[0];
        let maxP = -1;
        for (const [cardId, p] of priors) {
            if (p > maxP) {
                maxP = p;
                bestCard = cardId;
            }
        }
        return bestCard;
    }
    /**
     * Primary asynchronous entry point for bot card selection.
     * State-of-the-art hybrid combination:
     * 1. Neural Network Policy Priors (ONNX Deep RL)
     * 2. Information Set Monte Carlo Tree Search (ISMCTS with PUCT)
     * 3. Expert domain heuristics & blunder prevention
     */
    static async decideCardToPlayAsync(state, seatIndex, weights = BotEngine.championWeights) {
        const hand = state.hands[seatIndex];
        const legalIds = getLegalCardIds(hand, state.currentTrick, state.gameMode);
        if (legalIds.length === 0) {
            throw new Error(`No legal cards available for seat ${seatIndex}`);
        }
        if (legalIds.length === 1) {
            return legalIds[0];
        }
        // 1. Run ONNX Neural Network to obtain legal policy distribution
        let nnPriors = null;
        if (weights.useNeuralNetwork !== false) {
            nnPriors = await BotEngine.getNeuralNetworkPriors(state, seatIndex, legalIds);
        }
        // 2. Guide ISMCTS search and decision heuristics using the neural priors
        return BotEngine.decideCardToPlay(state, seatIndex, weights, nnPriors);
    }
    static decideCardToPlay(state, seatIndex, weights = BotEngine.championWeights, nnPriors) {
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
        const deductions = BotEngine.deduceGameState(state, seatIndex);
        // Information Set Monte Carlo Tree Search (ISMCTS), guided by NN policy priors
        let ismctsMap = null;
        if (weights.useISMCTS !== false) {
            try {
                const ismctsResult = ISMCTSEngine.search(state, seatIndex, weights, undefined, undefined, nnPriors);
                ismctsMap = new Map();
                for (const [cardId, stats] of ismctsResult.cardStats) {
                    ismctsMap.set(cardId, stats.combinedScore ?? stats.mctsScore);
                }
            }
            catch (err) {
                console.warn('ISMCTS search warning:', err);
            }
        }
        // 1. Bettl & Doppelbettl (Modes 9 & 11)
        if (mode === 9 || mode === 11) {
            return BotEngine.decideBettlCard(state, seatIndex, isDeclarer, legalCards, deductions, weights, ismctsMap, nnPriors);
        }
        // 2. Mord & Doppelmord (Modes 10 & 12)
        if (mode === 10 || mode === 12) {
            return BotEngine.decideMordCard(state, seatIndex, isDeclarer, legalCards, deductions, weights, ismctsMap, nnPriors);
        }
        // 3. Color Games (Modes 5..8)
        return BotEngine.decideColorCard(state, seatIndex, isDeclarer, legalCards, deductions, weights, ismctsMap, nnPriors);
    }
    // --- COLOR GAME TRICK PLAY ---
    static decideColorCard(state, seatIndex, isDeclarer, legalCards, deductions, weights = BotEngine.championWeights, ismctsMap, nnPriors) {
        const trumpSuit = GAME_MODE_INFO[state.gameMode]?.trumpSuit;
        const trick = state.currentTrick;
        const partnerSeat = isDeclarer
            ? -1
            : [0, 1, 2].find((s) => s !== seatIndex && s !== state.declarerSeat);
        const scoredCandidates = [];
        // --- POS 2: HINTERHAND (trick.length === 2) ---
        if (trick.length === 2) {
            const mode = state.gameMode;
            for (const card of legalCards) {
                const simulated = [...trick, { seatIndex, card }];
                const winner = GameEngine.determineTrickWinner(simulated, mode);
                const trickPoints = trick[0].card.points + trick[1].card.points + card.points;
                let score = 0;
                if (isDeclarer) {
                    if (winner === seatIndex) {
                        // Instant 66 win check
                        if (state.declarerCardPoints + trickPoints >= 66) {
                            score += 2000;
                        }
                        else {
                            // Win cheaply, preserve trumps if possible
                            const isTrump = card.suit === trumpSuit ? 1 : 0;
                            score += 150 + trickPoints * 2 - isTrump * 30 - card.rank * 2;
                        }
                    }
                    else {
                        // Defenders take trick: Wimmeln (dump 0 points!)
                        score += 100 - card.points * 10 - card.rank * 2;
                    }
                }
                else {
                    // Defender
                    if (winner === partnerSeat) {
                        // Partner wins! Check instant win for defenders
                        if (state.defenderCardPoints + trickPoints >= 66) {
                            score += 2000;
                        }
                        else {
                            // SCHMIEREN: feed points to partner!
                            score += 200 + card.points * 15 * (weights.smearAggression || 1.0) + card.rank * 2;
                        }
                    }
                    else if (winner === seatIndex) {
                        // Bot beats declarer!
                        if (state.defenderCardPoints + trickPoints >= 66) {
                            score += 2000;
                        }
                        else {
                            const isTrump = card.suit === trumpSuit ? 1 : 0;
                            score += 140 + trickPoints * 2 - isTrump * 20 - card.rank * 2;
                        }
                    }
                    else {
                        // Declarer wins: Wimmeln (dump 0 points!)
                        score += 100 - card.points * 12 - card.rank * 2;
                    }
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // --- POS 1: MITTELHAND (trick.length === 1) ---
        if (trick.length === 1) {
            const lead = trick[0];
            const leadCard = lead.card;
            const leadSeat = lead.seatIndex;
            for (const card of legalCards) {
                let score = 50;
                if (isDeclarer) {
                    // Declarer facing defender lead
                    const beatsLead = (card.suit === trumpSuit && leadCard.suit !== trumpSuit) ||
                        (card.suit === leadCard.suit && card.rank > leadCard.rank);
                    if (beatsLead) {
                        if (leadCard.points >= 10) {
                            // High points in trick: take it!
                            score += 120 - card.rank * 2;
                        }
                        else {
                            score += 70 - card.rank * 2;
                        }
                    }
                    else {
                        // Cannot beat: play 0-point card
                        score += 80 - card.points * 8 - card.rank;
                    }
                }
                else {
                    // Defender
                    if (leadSeat === partnerSeat) {
                        // Partner led! If partner led safe Ace, SCHMIERE!
                        if (leadCard.rank === 9 || (weights.smearAggression > 1.2 && leadCard.rank >= 7)) {
                            score += 150 + card.points * 12 * (weights.smearAggression || 1.0);
                        }
                        else {
                            score += 50 - card.points * 5;
                        }
                    }
                    else {
                        // Declarer led!
                        const beatsDeclarer = (card.suit === trumpSuit && leadCard.suit !== trumpSuit) ||
                            (card.suit === leadCard.suit && card.rank > leadCard.rank);
                        if (beatsDeclarer) {
                            if (card.rank === 9) {
                                // Cover with Ace!
                                score += 140;
                            }
                            else {
                                score += 110 - card.rank * 2;
                            }
                        }
                        else {
                            // Wimmeln
                            score += 90 - card.points * 10 - card.rank;
                        }
                    }
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // --- POS 0: ERSTAUSSPIELER (trick.length === 0) ---
        const declarerSeat = state.declarerSeat;
        for (const card of legalCards) {
            let score = 50;
            if (isDeclarer) {
                // Declarer lead strategy (PDF page 10):
                const def1 = (declarerSeat + 1) % 3;
                const def2 = (declarerSeat + 2) % 3;
                const defendersHaveTrump = deductions.unseenCards.some((c) => c.suit === trumpSuit) &&
                    (!deductions.isVoid[def1][trumpSuit] || !deductions.isVoid[def2][trumpSuit]);
                if (defendersHaveTrump) {
                    if (card.suit === trumpSuit) {
                        // Check Duck-Trumpf-Manöver: missing Ace and 10 of trumps
                        const myTrumps = legalCards.filter((c) => c.suit === trumpSuit);
                        const missingAceTen = !myTrumps.some((c) => c.rank >= 8);
                        if (missingAceTen && card.rank <= 3) {
                            score += 160; // Play low trump to force opponent Ace!
                        }
                        else {
                            score += 120 + card.rank * 5; // Lead highest trump
                        }
                    }
                    else {
                        score -= 30; // Trumps should be pulled first
                    }
                }
                else {
                    // Defenders are trump-free: cash off-suit Aces and high cards!
                    if (card.suit !== trumpSuit) {
                        if (card.rank === 9) {
                            score += 150; // Cash Ace!
                        }
                        else if (card.rank === 8) {
                            score += 110;
                        }
                        else {
                            score += 60 - card.points * 3;
                        }
                    }
                    else {
                        score += 40 + card.rank * 2;
                    }
                }
            }
            else {
                // Defender lead strategy (PDF page 11):
                const nextSeat = (seatIndex + 1) % 3;
                if (nextSeat === declarerSeat) {
                    // Declarer is Pos 1 (right after us):
                    // Doppel-Schnitt: If declarer is void in suit & partner has trump, attack!
                    if (deductions.isVoid[declarerSeat][card.suit] && !deductions.isVoid[partnerSeat][trumpSuit]) {
                        score += 180;
                    }
                    else if (card.rank === 8 && card.suit !== trumpSuit) {
                        // NEVER lead unprotected 10 into declarer!
                        score -= 300;
                    }
                    else if (card.rank === 7 || card.rank === 6) {
                        score += 90; // Lead King or Ober
                    }
                    else if (card.rank === 9 && card.suit !== trumpSuit) {
                        score += 80;
                    }
                    else {
                        score += 40 - card.points * 2;
                    }
                }
                else {
                    // Partner is Pos 1:
                    if (card.rank === 9 && card.suit !== trumpSuit) {
                        score += 140; // Lead safe Ace
                    }
                    else {
                        score += 60 - card.points * 2;
                    }
                }
            }
            if (ismctsMap && ismctsMap.has(card.id)) {
                score += ismctsMap.get(card.id);
            }
            if (nnPriors && nnPriors.has(card.id)) {
                score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
            }
            scoredCandidates.push({ cardId: card.id, score });
        }
        return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
    }
    // --- BETTL TRICK PLAY (PDF SECTION 5 & 7.4) ---
    static decideBettlCard(state, seatIndex, isDeclarer, legalCards, deductions, weights = BotEngine.championWeights, ismctsMap, nnPriors) {
        const trick = state.currentTrick;
        const scoredCandidates = [];
        if (isDeclarer) {
            // Declarer MUST avoid winning ANY trick
            if (trick.length === 0) {
                const trickNum = state.trickHistory.length + 1;
                // Kamikaze-Eröffnungsanspiel (PDF page 6 & 11) for tricks 1-2:
                if (trickNum <= 2) {
                    // Find suit with highest danger and lead unprotected middle card
                    for (const card of legalCards) {
                        let score = 50;
                        if (card.rank >= 4 && card.rank <= 7) {
                            score += 160; // Kamikaze lead: force opponents to overtrump now!
                        }
                        else if (card.rank <= 3) {
                            score += 40; // Do not waste safe 7 early!
                        }
                        else {
                            score += 20;
                        }
                        if (ismctsMap && ismctsMap.has(card.id)) {
                            score += ismctsMap.get(card.id);
                        }
                        if (nnPriors && nnPriors.has(card.id)) {
                            score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                        }
                        scoredCandidates.push({ cardId: card.id, score });
                    }
                }
                else {
                    // Tricks 3+: Lead lowest card of longest safe suit
                    for (const card of legalCards) {
                        let score = 100 - card.rank * 10;
                        if (ismctsMap && ismctsMap.has(card.id)) {
                            score += ismctsMap.get(card.id);
                        }
                        if (nnPriors && nnPriors.has(card.id)) {
                            score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                        }
                        scoredCandidates.push({ cardId: card.id, score });
                    }
                }
                return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
            }
            // Following in Bettl
            const leadSuit = trick[0].card.suit;
            const maxLeadRank = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
            for (const card of legalCards) {
                let score = 50;
                const isSafe = card.suit !== leadSuit || card.rank < maxLeadRank;
                if (isSafe) {
                    if (trick.length === 2) {
                        // Pos 2: Someone else already won! Duck with highest possible safe card!
                        score += 200 + card.rank * 10;
                    }
                    else {
                        // Pos 1: Duck as close to leadCard as possible
                        score += 180 - Math.abs(leadCardRankDifference(card, maxLeadRank));
                    }
                }
                else {
                    // Forced to play higher card: play lowest possible
                    score -= 100 + card.rank * 10;
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // Defender (Hunters) in Bettl: Goal is to make Declarer win a trick!
        const declarerSeat = state.declarerSeat;
        const declarerPlay = trick.find((t) => t.seatIndex === declarerSeat);
        // Pos 2: If Declarer is currently winning the trick: DUCK UNCONDITIONALLY!
        if (trick.length === 2 && declarerPlay) {
            const leadSuit = trick[0].card.suit;
            const decCard = declarerPlay.card;
            const highestLeadRank = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
            for (const card of legalCards) {
                let score = 50;
                if (decCard.suit === leadSuit && decCard.rank === highestLeadRank) {
                    // Declarer holds the trick!
                    if (card.suit === leadSuit && card.rank < decCard.rank) {
                        // Instant win for defenders!
                        score += 3000 + (decCard.rank - card.rank);
                    }
                    else {
                        // Cannot duck under declarer
                        score -= 200 + card.rank * 10;
                    }
                }
                else {
                    // Declarer not winning
                    score += 100 - card.rank * 5;
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // Pos 1: Mittelhand-Ducking (PDF page 7 & 11)
        if (trick.length === 1 && declarerPlay) {
            const leadCard = trick[0].card;
            for (const card of legalCards) {
                let score = 50;
                if (card.suit === leadCard.suit && card.rank < leadCard.rank) {
                    // Duck under declarer!
                    score += 300 + card.rank * 10;
                }
                else {
                    score -= 100;
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // Lead or partner lead in Bettl
        const partnerSeat = [0, 1, 2].find((s) => s !== seatIndex && s !== declarerSeat);
        for (const card of legalCards) {
            let score = 50;
            // Farb-Guillotine (PDF page 7): If partner is void, lead high card of that suit
            if (deductions.isVoid[partnerSeat][card.suit] && card.rank >= 7) {
                score += 180;
            }
            else if (card.rank >= 3 && card.rank <= 5) {
                score += 110; // Middle card
            }
            else {
                score += 70 - card.rank * 2;
            }
            if (ismctsMap && ismctsMap.has(card.id)) {
                score += ismctsMap.get(card.id);
            }
            if (nnPriors && nnPriors.has(card.id)) {
                score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
            }
            scoredCandidates.push({ cardId: card.id, score });
        }
        return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
    }
    // --- MORD TRICK PLAY (PDF SECTION 6 & 7.4) ---
    static decideMordCard(state, seatIndex, isDeclarer, legalCards, deductions, weights = BotEngine.championWeights, ismctsMap, nnPriors) {
        const trick = state.currentTrick;
        const scoredCandidates = [];
        if (isDeclarer) {
            // Declarer must win every trick! Play highest rank!
            for (const card of legalCards) {
                let score = card.rank * 10;
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        // Defender: Win ANY trick to defeat Mord immediately!
        if (trick.length > 0) {
            const leadSuit = trick[0].card.suit;
            const highestRank = Math.max(...trick.filter((t) => t.card.suit === leadSuit).map((t) => t.card.rank));
            for (const card of legalCards) {
                let score = 50;
                if (card.suit === leadSuit && card.rank > highestRank) {
                    score += 2000 + card.rank * 10; // Instant win for defenders!
                }
                else {
                    score += card.rank * 5;
                }
                if (ismctsMap && ismctsMap.has(card.id)) {
                    score += ismctsMap.get(card.id);
                }
                if (nnPriors && nnPriors.has(card.id)) {
                    score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
                }
                scoredCandidates.push({ cardId: card.id, score });
            }
            return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
        }
        for (const card of legalCards) {
            let score = card.rank * 5;
            if (ismctsMap && ismctsMap.has(card.id)) {
                score += ismctsMap.get(card.id);
            }
            if (nnPriors && nnPriors.has(card.id)) {
                score += nnPriors.get(card.id) * (weights.neuralNetworkWeight ?? 80);
            }
            scoredCandidates.push({ cardId: card.id, score });
        }
        return BotEngine.sampleMoveWithTemperature(scoredCandidates, weights.explorationTemperature ?? 3.0);
    }
    // =========================================================================
    // --- HAND EVALUATION HELPER (FOR BIDDING) ---
    // =========================================================================
    static evaluateHand(hand, weights = BotEngine.championWeights) {
        const suits = ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'];
        const suitToMode = {
            EICHEL: 5,
            LAUB: 6,
            SCHELL: 7,
            HERZ: 8,
        };
        let bestTrumpSuit = 'EICHEL';
        let bestTrumpMode = 5;
        let bestTrumpPower = -1;
        let bestExpectedValue = -Infinity;
        let bestOverallMode = 5;
        const viableModes = new Set();
        // 1. Evaluate Color Games
        for (const suit of suits) {
            const mode = suitToMode[suit];
            const prob = BotEngine.calculateColorWinProb(hand, [], suit, weights);
            const score = BotEngine.calculateColorScore(hand, [], suit, weights);
            const ev = (prob * 100) - ((1 - prob) * 100);
            if (score > bestTrumpPower) {
                bestTrumpPower = score;
                bestTrumpSuit = suit;
                bestTrumpMode = mode;
            }
            if (ev > bestExpectedValue) {
                bestExpectedValue = ev;
                bestOverallMode = mode;
            }
            const trumps = hand.filter((c) => c.suit === suit);
            if (trumps.length >= (weights.colorGameMinTrumpCount || 4) &&
                score >= (weights.colorGameMinPower || 26)) {
                viableModes.add(mode);
            }
        }
        // 2. Evaluate Bettl & Doppelbettl
        const bettlProb = BotEngine.calculateBettlWinProb(hand, weights);
        const bettlEV = bettlProb * 200 - (1 - bettlProb) * 200;
        const canBettl = bettlProb >= 0.55;
        if (canBettl)
            viableModes.add(9);
        if (bettlEV > bestExpectedValue) {
            bestExpectedValue = bettlEV;
            bestOverallMode = 9;
        }
        const doppelbettlProb = BotEngine.calculateDoppelbettlWinProb(hand, weights);
        const canDoppelbettl = doppelbettlProb >= 0.8;
        if (canDoppelbettl)
            viableModes.add(11);
        // 3. Evaluate Mord & Doppelmord
        const mordProb = BotEngine.calculateMordProbability(hand, weights);
        const mordEV = mordProb * 300 - (1 - mordProb) * 300;
        const canMord = mordProb >= 0.6;
        if (canMord)
            viableModes.add(10);
        if (mordEV > bestExpectedValue) {
            bestExpectedValue = mordEV;
            bestOverallMode = 10;
        }
        const doppelmordProb = BotEngine.calculateDoppelmordWinProb(hand, weights);
        const canDoppelmord = doppelmordProb >= 0.85;
        if (canDoppelmord)
            viableModes.add(12);
        let maxViableBid = 0;
        if (viableModes.size > 0) {
            maxViableBid = Math.max(4, ...Array.from(viableModes));
        }
        return {
            bestTrumpSuit,
            bestTrumpMode,
            bestTrumpPower,
            canBettl,
            canDoppelbettl,
            canMord,
            canDoppelmord,
            viableModes,
            maxViableBid,
            bestExpectedValue,
            bestMode: bestOverallMode,
        };
    }
    static canPlayAtLeast(evaluations, targetBid) {
        if (targetBid <= 4)
            return evaluations.maxViableBid >= 4;
        for (let m = targetBid; m <= 12; m++) {
            if (evaluations.viableModes.has(m))
                return true;
        }
        return false;
    }
}
function leadCardRankDifference(card, targetRank) {
    return card.rank - targetRank;
}
export { WattenBotAI } from './WattenBotAI.js';
export { SchnapsenBotAI } from './SchnapsenBotAI.js';
//# sourceMappingURL=BotEngine.js.map