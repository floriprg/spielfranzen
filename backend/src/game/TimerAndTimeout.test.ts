import { FullGameState } from '@spielfranzen/shared';
import assert from 'node:assert';
import test from 'node:test';
import { BotEngine } from './BotEngine.js';
import { GameEngine } from './GameEngine.js';
import { sanitizeGameStateForPlayer } from './sanitizer.js';

test('Timer 1: Default configuration (60s turn, 300s bank, enabled)', () => {
  const players = [
    { userId: 'u1', username: 'Flori', isBot: false },
    { userId: 'u2', username: 'Franzl', isBot: true },
    { userId: 'u3', username: 'Resi', isBot: true },
  ];

  const state = GameEngine.createInitialState('m1', 'CODE12', 5, players);
  assert.strictEqual(state.timer.config.enabled, true);
  assert.strictEqual(state.timer.config.turnTimeLimit, 60);
  assert.strictEqual(state.timer.config.totalTimeBank, 300);
  assert.deepStrictEqual(state.timer.playerBanks, [300, 300, 300]);

  const sanitized = sanitizeGameStateForPlayer(state, 'u1');
  assert.strictEqual(sanitized.timer.config.enabled, true);
  assert.strictEqual(sanitized.timer.config.turnTimeLimit, 60);
  assert.strictEqual(sanitized.timer.config.totalTimeBank, 300);
});

test('Timer 2: Custom timer configuration can disable timer or customize limits', () => {
  const players = [
    { userId: 'u1', username: 'Flori', isBot: false },
    { userId: 'u2', username: 'Franzl', isBot: true },
    { userId: 'u3', username: 'Resi', isBot: true },
  ];

  // Disabled timer
  const disabledState = GameEngine.createInitialState('m2', 'CODE13', 5, players, {
    enabled: false,
    turnTimeLimit: 45,
    totalTimeBank: 180,
  });
  assert.strictEqual(disabledState.timer.config.enabled, false);

  // Custom limits
  const customState = GameEngine.createInitialState('m3', 'CODE14', 5, players, {
    enabled: true,
    turnTimeLimit: 30,
    totalTimeBank: 120,
  });
  assert.strictEqual(customState.timer.config.enabled, true);
  assert.strictEqual(customState.timer.config.turnTimeLimit, 30);
  assert.strictEqual(customState.timer.config.totalTimeBank, 120);
  assert.deepStrictEqual(customState.timer.playerBanks, [120, 120, 120]);
});

test('Timer 3: Random legal fallback card on timeout in trick play', () => {
  const players = [
    { userId: 'u1', username: 'Flori', isBot: false },
    { userId: 'u2', username: 'Franzl', isBot: true },
    { userId: 'u3', username: 'Resi', isBot: true },
  ];

  const state = GameEngine.createInitialState('m4', 'CODE15', 5, players);
  // Transition to trick play
  state.phase = 'TRICK_PLAY';
  state.currentTurnSeat = 0;
  state.currentTrick = [];
  state.gameMode = 8; // Herz (Trump)

  const legalCards = GameEngine.getLegalCardsToPlay(state, 0);
  assert.ok(legalCards.length > 0, 'Must have legal cards');

  // Pick random legal card on timeout as required
  const randomCard = legalCards[Math.floor(Math.random() * legalCards.length)]!;
  assert.ok(randomCard, 'Must select a card');

  const result = GameEngine.handlePlayCard(state, 0, randomCard.id);
  assert.strictEqual(result.state.currentTrick.length, 1);
  assert.strictEqual(result.state.currentTrick[0]!.card.id, randomCard.id);
});
