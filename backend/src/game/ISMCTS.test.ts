import assert from 'node:assert';
import test from 'node:test';
import { Card, GameMode, Suit } from '@spielfranzen/shared';
import { ISMCTSEngine } from './ISMCTS.js';
import { GameEngine } from './GameEngine.js';
import { BotEngine } from './BotEngine.js';

test('ISMCTS 1: Determinization strictly respects void deductions', () => {
  const players = [
    { userId: 'u0', username: 'Observer', isBot: true },
    { userId: 'u1', username: 'Opponent 1', isBot: true },
    { userId: 'u2', username: 'Opponent 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('ismcts-det-test', 'DET', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // EICHEL trump
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;

  // Observer hand: 5 cards
  state.hands[0] = [
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' },
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
  ];

  // Opponents each have 5 cards left
  state.hands[1] = new Array(5).fill(null) as any;
  state.hands[2] = new Array(5).fill(null) as any;

  // Mark Opponent 1 void in LAUB, Opponent 2 void in HERZ
  const deductions = BotEngine.deduceGameState(state, 0);
  deductions.isVoid[1]!.LAUB = true;
  deductions.isVoid[2]!.HERZ = true;

  // Run determinization 40 times and check constraints
  for (let trial = 0; trial < 40; trial++) {
    const sim = ISMCTSEngine.determinize(state, 0, deductions);

    // Opponent 1 must not hold any LAUB cards
    const opp1Laub = sim.hands[1]!.filter((c) => c.suit === 'LAUB');
    assert.strictEqual(
      opp1Laub.length,
      0,
      `Trial ${trial}: Opponent 1 received void suit LAUB!`,
    );

    // Opponent 2 must not hold any HERZ cards
    const opp2Herz = sim.hands[2]!.filter((c) => c.suit === 'HERZ');
    assert.strictEqual(
      opp2Herz.length,
      0,
      `Trial ${trial}: Opponent 2 received void suit HERZ!`,
    );

    // Hand counts must match
    assert.strictEqual(sim.hands[0]!.length, 5);
    assert.strictEqual(sim.hands[1]!.length, 5);
    assert.strictEqual(sim.hands[2]!.length, 5);
  }
});

test('ISMCTS 2: Search identifies game-winning move in trick play', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('ismcts-win-test', 'WIN', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 8; // Herz trump
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;
  state.declarerCardPoints = 55; // 55 points: winning trick with >= 11 points wins immediately!

  // Trick: Seat 0 to lead
  state.currentTrick = [];

  // Declarer hand: Herz Ass (11 pts) vs Herz 7 (0 pts)
  state.hands[0] = [
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' },
  ];
  state.hands[1] = [
    { id: 'HERZ_3', suit: 'HERZ', rank: 3, points: 0, name: 'Herz 8', shortName: '8' },
  ];
  state.hands[2] = [
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
  ];

  const result = ISMCTSEngine.search(state, 0, undefined, 100);

  // HERZ_9 (Herz Ass) immediately wins trick, guarantees 55 + 11 = 66 points!
  assert.strictEqual(
    result.bestCardId,
    'HERZ_9',
    'ISMCTS must find that HERZ_9 guarantees winning trick and clinches 66 points',
  );

  const statsAss = result.cardStats.get('HERZ_9')!;
  const statsLow = result.cardStats.get('HERZ_2')!;

  assert.ok(statsAss.winRate > statsLow.winRate, 'HERZ_9 winRate must be strictly higher than HERZ_2');
  assert.ok(result.iterationsRun >= 50, 'ISMCTS must execute search iterations');
  assert.ok(result.timeMs < 100, `Search must be fast (< 100ms), took ${result.timeMs}ms`);
});

test('ISMCTS 3: Search avoids trick capture in Bettl', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('ismcts-b行為ettl', 'BETTL', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 9; // Bettl (Declarer must not take any trick)
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;

  // Trick: Seat 1 led Schell 10 (rank 8)
  state.currentTrick = [
    {
      seatIndex: 1,
      card: { id: 'SCHELL_8', suit: 'SCHELL', rank: 8, points: 10, name: 'Schell 10', shortName: '10' },
    },
  ];

  // Declarer (Seat 0) has Schell Ass (rank 9, loses Bettl!) vs Schell 7 (rank 2, safe duck)
  state.hands[0] = [
    { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7', shortName: '7' },
  ];
  state.hands[1] = [
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
  ];
  state.hands[2] = [
    { id: 'SCHELL_3', suit: 'SCHELL', rank: 3, points: 0, name: 'Schell 8', shortName: '8' },
  ];

  const result = ISMCTSEngine.search(state, 0, undefined, 100);

  // Playing SCHELL_9 captures the trick and immediately forfeits Bettl!
  // SCHELL_2 safely ducks under SCHELL_8!
  assert.strictEqual(
    result.bestCardId,
    'SCHELL_2',
    'ISMCTS must select safe undercard SCHELL_2 in Bettl to avoid taking trick',
  );

  const statsDuck = result.cardStats.get('SCHELL_2')!;
  const statsKill = result.cardStats.get('SCHELL_9')!;

  assert.ok(
    statsDuck.winRate > statsKill.winRate,
    `Safe duck win rate (${statsDuck.winRate}) must beat capturing card win rate (${statsKill.winRate})`,
  );
});

test('ISMCTS 4: End-to-end bot card play integration with ISMCTS', () => {
  const players = [
    { userId: 'p0', username: 'Bot 1', isBot: true },
    { userId: 'p1', username: 'Bot 2', isBot: true },
    { userId: 'p2', username: 'Bot 3', isBot: true },
  ];

  const state = GameEngine.createInitialState('ismcts-e2e', 'E2E', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 6; // Laub trump
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;

  state.hands[0] = [
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' },
  ];
  state.hands[1] = [
    { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10', shortName: '10' },
    { id: 'EICHEL_7', suit: 'EICHEL', rank: 7, points: 4, name: 'Eichel König', shortName: 'K' },
  ];
  state.hands[2] = [
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
  ];

  // Ask BotEngine to decide a card to play with ISMCTS enabled
  const chosenCardId = BotEngine.decideCardToPlay(state, 0);
  assert.ok(
    chosenCardId === 'LAUB_9' || chosenCardId === 'EICHEL_8',
    'Chosen card must be one of the legal cards in hand',
  );
});
