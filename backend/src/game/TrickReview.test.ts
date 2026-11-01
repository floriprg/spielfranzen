import assert from 'node:assert';
import test from 'node:test';
import { GameEngine } from './GameEngine.js';
import { sanitizeGameStateForPlayer } from './sanitizer.js';

test('Trick Review: 3rd card remains on table until cleared, locking player actions', () => {
  const players = [
    { userId: 'u0', username: 'Player 0', isBot: false },
    { userId: 'u1', username: 'Player 1', isBot: false },
    { userId: 'u2', username: 'Player 2', isBot: false },
  ];

  const state = GameEngine.createInitialState('trick-review-test', 'REVIEW', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // Eichel
  state.declarerSeat = 0;
  state.trickLeadSeat = 0;
  state.currentTurnSeat = 0;

  // Assign hands
  state.hands[0] = [
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
  ];
  state.hands[1] = [
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10er', shortName: '10' },
  ];
  state.hands[2] = [
    { id: 'EICHEL_7', suit: 'EICHEL', rank: 7, points: 4, name: 'Eichel König', shortName: 'K' },
  ];

  // Card 1
  const res1 = GameEngine.handlePlayCard(state, 0, 'EICHEL_9');
  assert.strictEqual(res1.trickCompleted, false);
  assert.strictEqual(state.currentTrick.length, 1);

  // Card 2
  const res2 = GameEngine.handlePlayCard(state, 1, 'EICHEL_8');
  assert.strictEqual(res2.trickCompleted, false);
  assert.strictEqual(state.currentTrick.length, 2);

  // Card 3 (Completes the trick)
  const res3 = GameEngine.handlePlayCard(state, 2, 'EICHEL_7');
  assert.strictEqual(res3.trickCompleted, true);

  // CRITICAL REQUIREMENT: The 3rd card MUST be present on the table!
  assert.strictEqual(state.currentTrick.length, 3, 'Table MUST hold all 3 cards after 3rd card is played!');
  assert.strictEqual(state.currentTrick[2]!.card.id, 'EICHEL_7', '3rd card must be Eichel 7');

  // Verify that sanitized state locks player moves while 3 cards are on the table
  const sanitized = sanitizeGameStateForPlayer(state, 'u0');
  assert.strictEqual(sanitized.currentTrick.length, 3, 'Clients must receive all 3 cards in currentTrick');
  assert.strictEqual(
    sanitized.legalCardIdsToPlay.length,
    0,
    'No player should have legal playable cards while trick is being reviewed for 3 seconds',
  );

  // Clear trick (which happens after 3.2 seconds on server)
  GameEngine.clearCurrentTrick(state);
  assert.strictEqual(state.currentTrick.length, 0, 'Current trick must be empty after clearing');

  // Now trick winner (seat 0) can play next card
  const sanitizedAfterClear = sanitizeGameStateForPlayer(state, 'u0');
  assert.ok(sanitizedAfterClear.legalCardIdsToPlay.length > 0, 'Player can play again after trick is cleared');
});
