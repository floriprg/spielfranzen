import assert from 'node:assert';
import test from 'node:test';
import { BotEngine } from './BotEngine.js';
import { GameEngine } from './GameEngine.js';
test('10. Bot Full Round Simulation: Plays through dealing, bidding, talon, 10 tricks to completion', () => {
    const players = [
        { userId: 'bot-0', username: 'Bot 1', isBot: true },
        { userId: 'bot-1', username: 'Bot 2', isBot: true },
        { userId: 'bot-2', username: 'Bot 3', isBot: true },
    ];
    const state = GameEngine.createInitialState('match-sim', 'BOTSIM', 1, players);
    assert.strictEqual(state.phase, 'BIDDING');
    // Simulate Bidding
    let biddingSteps = 0;
    while (state.phase === 'BIDDING' && biddingSteps < 50) {
        biddingSteps++;
        const seat = state.currentTurnSeat;
        const bidDecision = BotEngine.decideBidAction(state, seat);
        GameEngine.handleBid(state, seat, bidDecision.action, bidDecision.bidValue);
    }
    assert.ok(state.phase === 'TALON_AND_DECLARATION' || state.phase === 'BIDDING', 'Must reach declaration or redeal');
    // If reached declaration
    if (state.phase === 'TALON_AND_DECLARATION') {
        const declarer = state.declarerSeat;
        const talonDecision = BotEngine.decideTalonAction(state, declarer);
        GameEngine.handleTalonAction(state, declarer, talonDecision.action, talonDecision.discardedCardIds, talonDecision.selectedMode);
        assert.strictEqual(state.phase, 'TRICK_PLAY');
        assert.ok(state.gameMode !== null);
        // Simulate Trick Play until round ends
        let trickSteps = 0;
        while (state.phase === 'TRICK_PLAY' && trickSteps < 35) {
            trickSteps++;
            const currentSeat = state.currentTurnSeat;
            const cardId = BotEngine.decideCardToPlay(state, currentSeat);
            const res = GameEngine.handlePlayCard(state, currentSeat, cardId);
            if (res.roundEnded) {
                break;
            }
        }
        assert.ok(state.phase === 'ROUND_SUMMARY' || state.phase === 'MATCH_COMPLETED', `Round must finish (current phase: ${state.phase})`);
        assert.ok(state.lastRoundResult !== null, 'Round result must be calculated');
        // Verify zero-sum
        const deltaDec = state.lastRoundResult.scoreDeltaDeclarer;
        const deltaDef = state.lastRoundResult.scoreDeltaDefenders;
        assert.strictEqual(deltaDec + 2 * deltaDef, 0, `Zero sum must hold: ${deltaDec} + 2 * ${deltaDef} === 0`);
    }
});
//# sourceMappingURL=BotSimulation.test.js.map