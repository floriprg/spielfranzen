import test from 'node:test';
import assert from 'node:assert';
import { GameEngine } from './GameEngine.js';
import { BotEngine } from './BotEngine.js';
import { ISMCTSEngine } from './ISMCTS.js';

test('Bot Neural Network (ONNX) 1: Pre-warming and model loading', async () => {
  const loaded = await BotEngine.initNeuralNetwork();
  assert.strictEqual(loaded, true, 'Neural network should load from franzen_bot.onnx');
});

test('Bot Neural Network (ONNX) 2: Deep RL inference produces legal card choice', async () => {
  const state = GameEngine.createInitialState(
    'test-match-onnx',
    '9999',
    1,
    [
      { userId: 'bot-0', username: 'Bot 0', isBot: true },
      { userId: 'bot-1', username: 'Bot 1', isBot: true },
      { userId: 'bot-2', username: 'Bot 2', isBot: true },
    ]
  );

  GameEngine.startNewRound(state);
  state.gameMode = 5; // Eichel
  state.phase = 'TRICK_PLAY';
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;
  state.trickLeadSeat = 0;

  const legalCards = GameEngine.getLegalCardsToPlay(state, 0);
  assert.ok(legalCards.length > 0, 'Must have legal cards');

  const chosenCardId = await BotEngine.decideCardToPlayAsync(state, 0);
  assert.ok(
    legalCards.some((c) => c.id === chosenCardId),
    `Chosen card ${chosenCardId} must be one of the legal cards: ${legalCards.map((c) => c.id).join(', ')}`
  );
});

test('Bot Neural Network (ONNX) 3: Complete simulated trick with neural network bots', async () => {
  const state = GameEngine.createInitialState(
    'test-match-onnx-trick',
    '8888',
    1,
    [
      { userId: 'bot-0', username: 'AlphaBot', isBot: true },
      { userId: 'bot-1', username: 'BetaBot', isBot: true },
      { userId: 'bot-2', username: 'GammaBot', isBot: true },
    ]
  );

  GameEngine.startNewRound(state);
  state.gameMode = 8; // Herz
  state.phase = 'TRICK_PLAY';
  state.declarerSeat = 1;
  state.currentTurnSeat = 1;
  state.trickLeadSeat = 1;

  for (let step = 0; step < 3; step++) {
    const seat = state.currentTurnSeat;
    const cardId = await BotEngine.decideCardToPlayAsync(state, seat);
    const legalCards = GameEngine.getLegalCardsToPlay(state, seat);
    assert.ok(
      legalCards.some((c) => c.id === cardId),
      `Seat ${seat} must play legal card`
    );
    GameEngine.handlePlayCard(state, seat, cardId);
  }

  assert.strictEqual(state.currentTrick.length, 3, 'Trick must have 3 cards played');
  assert.strictEqual(state.trickHistory.length, 1, 'Trick history must have 1 completed trick');
});

test('Bot Hybrid (ISMCTS + ONNX) 4: Softmax priors and PUCT MCTS integration', async () => {
  const state = GameEngine.createInitialState(
    'test-match-hybrid',
    '7777',
    1,
    [
      { userId: 'bot-0', username: 'HybridBot 0', isBot: true },
      { userId: 'bot-1', username: 'HybridBot 1', isBot: true },
      { userId: 'bot-2', username: 'HybridBot 2', isBot: true },
    ]
  );

  GameEngine.startNewRound(state);
  state.gameMode = 6; // Laub
  state.phase = 'TRICK_PLAY';
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;
  state.trickLeadSeat = 0;

  const legalCards = GameEngine.getLegalCardsToPlay(state, 0);
  const legalIds = legalCards.map((c) => c.id);

  // 1. Check getNeuralNetworkPriors
  const priors = await BotEngine.getNeuralNetworkPriors(state, 0, legalIds);
  assert.ok(priors !== null, 'Priors must not be null');
  assert.strictEqual(priors.size, legalIds.length, 'All legal cards must have a prior');

  let priorSum = 0;
  for (const [, prob] of priors) {
    assert.ok(prob >= 0 && prob <= 1, 'Prior probability must be in [0, 1]');
    priorSum += prob;
  }
  assert.ok(Math.abs(priorSum - 1.0) < 1e-4, `Priors must sum to ~1.0, got ${priorSum}`);

  // 2. Check ISMCTS search with priors
  const mctsResult = ISMCTSEngine.search(
    state,
    0,
    { mctsSimulations: 30, useNeuralNetwork: true, neuralNetworkWeight: 80 },
    undefined,
    undefined,
    priors,
  );
  assert.ok(mctsResult.cardStats.size > 0, 'MCTS must return stats');
  for (const [cardId, stats] of mctsResult.cardStats) {
    assert.ok(stats.nnPrior !== undefined, `Card ${cardId} stats must include nnPrior`);
    assert.ok(stats.combinedScore !== undefined, `Card ${cardId} stats must include combinedScore`);
  }
});
