import assert from 'node:assert';
import test from 'node:test';
import { Card, GameMode } from '@spielfranzen/shared';
import { BotEngine, DEFAULT_BOT_WEIGHTS } from './BotEngine.js';
import { GameEngine } from './GameEngine.js';

test('PDF 1: Declarer card points are strictly 0 after Talon action before trick 1', () => {
  const players = [
    { userId: 'u1', username: 'Alleinspieler', isBot: true },
    { userId: 'u2', username: 'Gegner 1', isBot: true },
    { userId: 'u3', username: 'Gegner 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('zero-point-test', 'ZERO', 1, players);
  state.phase = 'TALON_AND_DECLARATION';
  state.declarerSeat = 0;
  state.minMode = 5;

  // Declarer hand contains high cards
  state.hands[0] = [
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10', shortName: '10' },
    { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' },
    { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' },
    { id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Unter', shortName: 'U' },
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' },
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10', shortName: '10' },
    { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
  ];

  state.talon = [
    { id: 'SCHELL_8', suit: 'SCHELL', rank: 8, points: 10, name: 'Schell 10', shortName: '10' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7', shortName: '7' },
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
  ];

  // Discard 3 cards totaling 32 points!
  GameEngine.handleTalonAction(
    state,
    0,
    'discard_and_declare',
    ['EICHEL_9', 'EICHEL_8', 'LAUB_9'], // 11 + 10 + 11 = 32 points discarded!
    8, // Herz
  );

  assert.strictEqual(
    state.declarerCardPoints,
    0,
    'Declarer card points MUST be exactly 0 before trick play starts, discarded cards count 0 points!',
  );
});

test('PDF 2: Exact 286 Talon Optimization evaluates all combinations and selects optimal discards', () => {
  const cards13: Card[] = [
    // 6 Herz trumps
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10', shortName: '10' },
    { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' },
    { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' },
    { id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Unter', shortName: 'U' },
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
    // Side cards: Laub Ass
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    // Dangerous isolated side cards
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' },
    { id: 'EICHEL_3', suit: 'EICHEL', rank: 3, points: 0, name: 'Eichel 8', shortName: '8' },
    { id: 'SCHELL_8', suit: 'SCHELL', rank: 8, points: 10, name: 'Schell 10', shortName: '10' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7', shortName: '7' },
    // 2 junk cards from talon
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
  ];

  const combinations = BotEngine.getCombinations13Choose3(cards13);
  assert.strictEqual(combinations.length, 286, 'There must be exactly 286 combinations for 13 choose 3');

  const optimal = BotEngine.selectOptimalTalonAndMode(cards13, 5);
  console.log('PDF 2 OPTIMAL RESULT:', optimal);
  assert.strictEqual(optimal.selectedMode, 8, 'Best mode must be Herz (8)');
  assert.strictEqual(optimal.discardedCardIds.length, 3, 'Must discard exactly 3 cards');

  // Must preserve Herz trumps and Laub Ass, discarding dangerous/unprotected off-suit cards
  assert.ok(
    !optimal.discardedCardIds.includes('HERZ_9'),
    'Should not discard highest trump Ass',
  );
  assert.ok(
    !optimal.discardedCardIds.includes('LAUB_9'),
    'Should not discard winning side Ass',
  );
});

test('PDF 3: Bettl 8er-9er-Klippen-Theorem danger calculation', () => {
  // Hand with Singleton 8 in Eichel
  const handWith8: Card[] = [
    { id: 'EICHEL_3', suit: 'EICHEL', rank: 3, points: 0, name: 'Eichel 8', shortName: '8' },
    // 9 safe cards in Laub, Schell, Herz
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
    { id: 'LAUB_3', suit: 'LAUB', rank: 3, points: 0, name: 'Laub 8', shortName: '8' },
    { id: 'LAUB_4', suit: 'LAUB', rank: 4, points: 0, name: 'Laub 9', shortName: '9' },
    { id: 'SCHELL_WELI', suit: 'SCHELL', rank: 1, points: 0, name: 'Weli', shortName: 'W' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7', shortName: '7' },
    { id: 'SCHELL_3', suit: 'SCHELL', rank: 3, points: 0, name: 'Schell 8', shortName: '8' },
    { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' },
    { id: 'HERZ_3', suit: 'HERZ', rank: 3, points: 0, name: 'Herz 8', shortName: '8' },
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
  ];

  // Hand with Singleton 9 in Eichel instead
  const handWith9: Card[] = [
    { id: 'EICHEL_4', suit: 'EICHEL', rank: 4, points: 0, name: 'Eichel 9', shortName: '9' },
    ...handWith8.slice(1),
  ];

  const danger8 = BotEngine.calculateBettlDanger(handWith8);
  const danger9 = BotEngine.calculateBettlDanger(handWith9);

  // According to Theorem 2 in PDF:
  // Singleton 8 has 1 lower missing card (7er) => danger = 9
  // Singleton 9 has 2 lower missing cards (7er and 8er) => danger = 18
  assert.strictEqual(danger8, 9, 'Singleton 8 has lowerMissing = 1 => 9 danger');
  assert.strictEqual(danger9, 18, 'Singleton 9 has lowerMissing = 2 => 18 danger');
  assert.ok(danger9 > danger8, 'Singleton 9 must have significantly higher danger than Singleton 8');
});

test('PDF 4: Deductive Memory marks void in Trumpf on Trumpfzwang failure', () => {
  const players = [
    { userId: 'u1', username: 'Declarer', isBot: true },
    { userId: 'u2', username: 'Defender 1', isBot: true },
    { userId: 'u3', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('deduction-test', 'DED', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // EICHEL is trump
  state.declarerSeat = 0;

  // Trick 1:
  // Seat 0 led LAUB 9 (Laub Ass)
  // Seat 1 played LAUB 2 (followed suit)
  // Seat 2 played HERZ 2 (failed to follow LAUB, and did NOT play EICHEL trump!)
  state.trickHistory = [
    {
      trickNumber: 1,
      leadSeat: 0,
      cards: [
        { seatIndex: 0, card: { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' } },
        { seatIndex: 1, card: { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' } },
        { seatIndex: 2, card: { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' } },
      ],
      winnerSeat: 0,
      points: 11,
    },
  ];

  const deductions = BotEngine.deduceGameState(state, 0);

  // Seat 2 did not follow LAUB -> isVoid[2].LAUB === true
  assert.strictEqual(deductions.isVoid[2]!.LAUB, true, 'Seat 2 must be deduced void in LAUB');

  // Deduktionsstufe 2 (Trumpfzwang-Inferenz): Seat 2 had neither LAUB nor EICHEL trump!
  assert.strictEqual(
    deductions.isVoid[2]!.EICHEL,
    true,
    'Seat 2 must be deduced void in EICHEL trump due to Trumpfzwang inference',
  );

  // Seat 1 followed LAUB, so is not void
  assert.strictEqual(deductions.isVoid[1]!.LAUB, false, 'Seat 1 followed suit, not void');
});

test('PDF 5: Non-deterministic AI move selection produces legal variation', () => {
  const candidates = [
    { cardId: 'C1', score: 100 },
    { cardId: 'C2', score: 98 },
    { cardId: 'C3', score: 97 },
  ];

  const counts: Record<string, number> = { C1: 0, C2: 0, C3: 0 };
  for (let i = 0; i < 200; i++) {
    const pick = BotEngine.sampleMoveWithTemperature(candidates, 3.0);
    counts[pick] = (counts[pick] || 0) + 1;
  }

  // All 3 close candidates should be explored, with C1 having the highest count
  assert.ok(counts['C1']! > counts['C2']!, 'C1 (score 100) should be chosen more often than C2 (98)');
  assert.ok(counts['C2']! > 0, 'C2 should be sampled non-deterministically');
  assert.ok(counts['C3']! > 0, 'C3 should be sampled non-deterministically');
});

test('PDF 6: Vakuum-Trap heuristic rewards discarding high points when trump length is overwhelming', () => {
  // Hand with 6 Herz trumps (Ace + small trumps: 11 + 4 + 3 + 2 + 0 + 0 = 20 points in trumps)
  // Non-trump cards: 4 junk cards (0 points)
  const hand10: Card[] = [
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' },
    { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' },
    { id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Unter', shortName: 'U' },
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
    { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' },
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
    { id: 'EICHEL_3', suit: 'EICHEL', rank: 3, points: 0, name: 'Eichel 8', shortName: '8' },
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7', shortName: '7' },
  ];

  // Discard 1: 3 zero-point cards
  const discardZero: Card[] = [
    { id: 'LAUB_3', suit: 'LAUB', rank: 3, points: 0, name: 'Laub 8', shortName: '8' },
    { id: 'LAUB_4', suit: 'LAUB', rank: 4, points: 0, name: 'Laub 9', shortName: '9' },
    { id: 'SCHELL_3', suit: 'SCHELL', rank: 3, points: 0, name: 'Schell 8', shortName: '8' },
  ];

  // Discard 2: 32 points into talon!
  const discardVakuum: Card[] = [
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
    { id: 'SCHELL_8', suit: 'SCHELL', rank: 8, points: 10, name: 'Schell 10', shortName: '10' },
  ];

  const scoreZero = BotEngine.calculateColorScore(hand10, discardZero, 'HERZ');
  const scoreVakuum = BotEngine.calculateColorScore(hand10, discardVakuum, 'HERZ');

  // scoreVakuum should be boosted by vacuumBonusMultiplier * 32
  assert.ok(
    scoreVakuum > scoreZero + 20,
    `Vakuum trap discard (score ${scoreVakuum}) must significantly exceed zero discard (score ${scoreZero})`,
  );
});
