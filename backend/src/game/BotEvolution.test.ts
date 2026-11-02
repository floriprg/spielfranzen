import assert from 'node:assert';
import test from 'node:test';
import { BotEngine, DEFAULT_BOT_WEIGHTS } from './BotEngine.js';
import { BotEvolutionSimulator } from './BotEvolutionSimulator.js';

test('Bot Evolution 1: Simulating duplicate round between 3 bots', () => {
  const result = BotEvolutionSimulator.simulateRound([
    DEFAULT_BOT_WEIGHTS,
    DEFAULT_BOT_WEIGHTS,
    DEFAULT_BOT_WEIGHTS,
  ]);

  assert.ok(result.gameMode >= 5 && result.gameMode <= 12, 'Must pick valid game mode');
  assert.ok(result.declarerSeat >= 0 && result.declarerSeat <= 2, 'Must pick valid declarer');
  assert.strictEqual(
    result.deltas[0] + result.deltas[1] + result.deltas[2],
    0,
    'Total point delta across all 3 players must sum to 0 (Zero-Sum)',
  );
});

test('Bot Evolution 2: Crossover and mutation produces valid bounded weights', () => {
  const parentA = { ...DEFAULT_BOT_WEIGHTS, trumpLeadTendency: 1.8, smearAggression: 1.6 };
  const parentB = { ...DEFAULT_BOT_WEIGHTS, trumpLeadTendency: 0.8, smearAggression: 0.9 };

  const hybrid = BotEvolutionSimulator.crossover(parentA, parentB);
  const mutated = BotEvolutionSimulator.mutateWeights(hybrid, 1.0); // 100% mutation rate

  assert.ok(mutated.trumpLeadTendency >= 0.5 && mutated.trumpLeadTendency <= 2.0);
  assert.ok(mutated.smearAggression >= 0.5 && mutated.smearAggression <= 2.0);
  assert.ok(mutated.colorGameMinTrumpCount >= 3 && mutated.colorGameMinTrumpCount <= 5);
  assert.ok(mutated.colorGameMinPower >= 20 && mutated.colorGameMinPower <= 36);
});

test('Bot Evolution 3: Multi-generation tournament runs and updates champion weights', () => {
  // Run a quick 2-generation mini-tournament
  const result = BotEvolutionSimulator.runEvolution(2, 4, 2);

  assert.strictEqual(result.generation, 2);
  assert.ok(result.totalGamesPlayed > 0);
  assert.strictEqual(result.rankings.length, 4);
  assert.ok(result.champion !== undefined);

  // Check that the engine loaded champion weights properly
  const activeChampion = BotEngine.getChampionWeights();
  assert.ok(activeChampion.name !== undefined);
  assert.ok(activeChampion.smearAggression >= 0.5);
});
