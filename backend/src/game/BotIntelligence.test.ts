import assert from 'node:assert';
import test from 'node:test';
import { Card, GameMode, Suit } from '@spielfranzen/shared';
import { BotEngine } from './BotEngine.js';
import { GameEngine } from './GameEngine.js';

test('Bot Intelligence 1: Smearing (Schmieren) into partner trick as defender', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('smear-test', 'SMEAR', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // Eichel is trump
  state.declarerSeat = 0; // Seat 0 is Declarer
  state.currentTurnSeat = 2; // Seat 2 is Defender 2 (Bot)

  // Trick so far:
  // Seat 1 (Partner) led Laub Ass (rank 9, 11 points)
  // Seat 0 (Declarer) followed with Laub 7 (rank 2, 0 points)
  state.currentTrick = [
    {
      seatIndex: 1,
      card: { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    },
    {
      seatIndex: 0,
      card: { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
    },
  ];

  // Defender 2 hand: Laub 10 (rank 8, 10 pts) and Laub 8 (rank 3, 0 pts)
  state.hands[2] = [
    { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10er', shortName: '10' },
    { id: 'LAUB_3', suit: 'LAUB', rank: 3, points: 0, name: 'Laub 8er', shortName: '8' },
  ];

  const chosenCardId = BotEngine.decideCardToPlay(state, 2);

  // Defender 2 MUST smear the Laub 10 (10 points) into partner's winning trick!
  assert.strictEqual(
    chosenCardId,
    'LAUB_8',
    'Defender must smear Laub 10 (10 points) into partner trick instead of playing low',
  );
});

test('Bot Intelligence 2: Ducking (Wimmeln) into declarer trick as defender', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('duck-test', 'DUCK', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // Eichel is trump
  state.declarerSeat = 0; // Seat 0 is Declarer
  state.currentTurnSeat = 2; // Seat 2 is Defender 2 (Bot)

  // Trick so far:
  // Seat 0 (Declarer) led Laub Ass (rank 9, 11 points)
  // Seat 1 (Partner) followed with Laub 7 (rank 2, 0 points)
  state.currentTrick = [
    {
      seatIndex: 0,
      card: { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    },
    {
      seatIndex: 1,
      card: { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' },
    },
  ];

  // Defender 2 hand: Laub 10 (10 pts) and Laub 8 (0 pts)
  state.hands[2] = [
    { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10er', shortName: '10' },
    { id: 'LAUB_3', suit: 'LAUB', rank: 3, points: 0, name: 'Laub 8er', shortName: '8' },
  ];

  const chosenCardId = BotEngine.decideCardToPlay(state, 2);

  // Defender 2 MUST NOT feed points to Declarer! Must play Laub 8 (0 points)!
  assert.strictEqual(
    chosenCardId,
    'LAUB_3',
    'Defender must duck with Laub 8 (0 points) and NOT throw Laub 10 to Declarer',
  );
});

test('Bot Intelligence 3: Bettl Ducking by Defender to force Declarer into winning trick', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('b行為ettl-test', 'BETTL', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 9; // Bettl (Declarer wants 0 tricks, Defenders want Declarer to take trick)
  state.declarerSeat = 0;
  state.currentTurnSeat = 1; // Defender 1 (Bot)

  // Trick so far:
  // Seat 0 (Declarer) led Schell 8 (rank 3)
  state.currentTrick = [
    {
      seatIndex: 0,
      card: { id: 'SCHELL_3', suit: 'SCHELL', rank: 3, points: 0, name: 'Schell 8er', shortName: '8' },
    },
  ];

  // Defender 1 hand: Schell 7 (rank 2) and Schell Ass (rank 9)
  state.hands[1] = [
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7er', shortName: '7' },
    { id: 'SCHELL_9', suit: 'SCHELL', rank: 9, points: 11, name: 'Schell Ass', shortName: 'A' },
  ];

  const chosenCardId = BotEngine.decideCardToPlay(state, 1);

  // Defender 1 must play Schell 7 (rank 2 < rank 3), ducking under Declarer to force Declarer to keep the trick!
  assert.strictEqual(
    chosenCardId,
    'SCHELL_2',
    'Defender must duck with Schell 7 so Declarer takes the trick in Bettl',
  );
});

test('Bot Intelligence 4: Instant 66-Eye Win Evaluation', () => {
  const players = [
    { userId: 'dec', username: 'Declarer', isBot: true },
    { userId: 'def1', username: 'Defender 1', isBot: true },
    { userId: 'def2', username: 'Defender 2', isBot: true },
  ];

  const state = GameEngine.createInitialState('instant-test', 'INSTANT', 1, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // Eichel
  state.declarerSeat = 0;
  state.currentTurnSeat = 0; // Declarer turn 3rd in trick

  state.declarerCardPoints = 50; // Needs 16 points

  state.currentTrick = [
    {
      seatIndex: 1,
      card: { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10er', shortName: '10' },
    },
    {
      seatIndex: 2,
      card: { id: 'LAUB_7', suit: 'LAUB', rank: 7, points: 4, name: 'Laub König', shortName: 'K' },
    },
  ];

  // Declarer hand: Laub Ass (11 pts, rank 9) and Laub Unter (2 pts, rank 5)
  // If Laub Ass played: points in trick = 10 + 4 + 11 = 25 -> 50 + 25 = 75 >= 66 (INSTANT WIN)
  // If Laub Unter played: points = 10 + 4 + 2 = 16, but Unter loses to König!
  state.hands[0] = [
    { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' },
    { id: 'LAUB_5', suit: 'LAUB', rank: 5, points: 2, name: 'Laub Unter', shortName: 'U' },
  ];

  const chosenCardId = BotEngine.decideCardToPlay(state, 0);
  assert.strictEqual(chosenCardId, 'LAUB_9', 'Declarer must play Laub Ass to win immediately with >= 66 eyes');
});

test('Bot Intelligence 5: 50 Full Automated Rounds Simulation without any errors or invalid moves', () => {
  for (let round = 1; round <= 50; round++) {
    const players = [
      { userId: 'b1', username: 'Hansi (Bot)', isBot: true },
      { userId: 'b2', username: 'Franzl (Bot)', isBot: true },
      { userId: 'b3', username: 'Resi (Bot)', isBot: true },
    ];

    const state = GameEngine.createInitialState(`sim-${round}`, `S${round}`, 1, players);

    // Bidding
    let bids = 0;
    while (state.phase === 'BIDDING' && bids < 30) {
      bids++;
      const seat = state.currentTurnSeat;
      const decision = BotEngine.decideBidAction(state, seat);
      GameEngine.handleBid(state, seat, decision.action, decision.bidValue);
    }

    if (state.phase === 'TALON_AND_DECLARATION') {
      const declarer = state.declarerSeat!;
      const talonDec = BotEngine.decideTalonAction(state, declarer);
      GameEngine.handleTalonAction(
        state,
        declarer,
        talonDec.action,
        talonDec.discardedCardIds,
        talonDec.selectedMode,
      );

      assert.strictEqual(state.phase, 'TRICK_PLAY');

      // Trick play
      let tricks = 0;
      while (state.phase === 'TRICK_PLAY' && tricks < 35) {
        tricks++;
        const currentSeat = state.currentTurnSeat;
        const cardId = BotEngine.decideCardToPlay(state, currentSeat);
        const res = GameEngine.handlePlayCard(state, currentSeat, cardId);
        if (res.roundEnded) break;
      }

      assert.ok(
        state.phase === 'ROUND_SUMMARY' || state.phase === 'MATCH_COMPLETED',
        `Round must finish cleanly (was ${state.phase})`,
      );

      // Verify Zero-Sum score delta
      const res = state.lastRoundResult!;
      assert.strictEqual(
        res.scoreDeltaDeclarer + 2 * res.scoreDeltaDefenders,
        0,
        `Round ${round} zero-sum invariant violated: ${res.scoreDeltaDeclarer} + 2 * ${res.scoreDeltaDefenders} !== 0`,
      );
    }
  }
});
