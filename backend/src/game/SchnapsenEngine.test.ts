import assert from 'node:assert';
import test from 'node:test';
import { Card, CardRank, FullGameState } from '@spielfranzen/shared';
import { SchnapsenEngine } from './SchnapsenEngine.js';
import { SchnapsenMoveValidator } from './SchnapsenMoveValidator.js';

test('1. Zudrehen-Wertung bei Sieg vs. Niederlage des Zudrehers (Wienerisch / Finster)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'test-zudrehen',
    'ZUD001',
    5,
    [
      { userId: 'u0', username: 'P0_Dealer', isBot: false },
      { userId: 'u1', username: 'P1_Vorhand', isBot: false },
    ],
  );

  // Setup: 1 trick has been played, Vorhand (1) is on lead
  state.trickHistory = [
    { trickNumber: 1, leadSeat: 1, winnerSeat: 1, cards: [], points: 10 },
  ];
  state.players[1]!.tricksWon = 1;
  state.players[0]!.tricksWon = 0; // Opponent had 0 tricks at closing!
  state.schnapsenState!.playerEyes = [0, 10];
  state.currentTurnSeat = 1;
  state.currentTrick = [];

  // P1 closes the talon (Zudrehen)
  engine.handleSchnapsenAction(state, 1, { action: 'close_talon' });
  assert.strictEqual(state.schnapsenState!.talonClosed, true);
  assert.strictEqual(state.schnapsenState!.talonClosedBySeat, 1);
  assert.strictEqual(state.schnapsenState!.talonClosedOpponentTricks, 0);
  assert.strictEqual(state.schnapsenState!.talonClosedOpponentEyes, 0);

  // CASE 1A: Closer reaches >= 66 eyes and claims 66
  // Since opponent had 0 tricks at closing -> Closer scores 3 points!
  state.schnapsenState!.playerEyes[1] = 68;
  const resWin = engine.handleSchnapsenAction(state, 1, { action: 'declare_66' });
  assert.strictEqual(resWin.roundEnded, true);
  assert.strictEqual(resWin.state.players[1]!.score, 7 - 3, 'Closer scores 3 points when opponent had 0 tricks at closing');

  // CASE 1B: Closer lost (fails to reach 66 or opponent claims 66)
  const stateLoss = engine.createInitialState(
    'test-zudrehen-loss',
    'ZUD002',
    5,
    [
      { userId: 'u0', username: 'P0_Dealer', isBot: false },
      { userId: 'u1', username: 'P1_Vorhand', isBot: false },
    ],
  );
  stateLoss.trickHistory = [
    { trickNumber: 1, leadSeat: 1, winnerSeat: 1, cards: [], points: 10 },
  ];
  stateLoss.players[1]!.tricksWon = 1;
  stateLoss.players[0]!.tricksWon = 0; // Opponent had 0 tricks at closing!
  stateLoss.currentTurnSeat = 1;
  stateLoss.currentTrick = [];
  engine.handleSchnapsenAction(stateLoss, 1, { action: 'close_talon' });

  // P1 mistakenly declares 66 with only 40 eyes (Irrtum)
  stateLoss.schnapsenState!.playerEyes[1] = 40;
  const resLoss = engine.handleSchnapsenAction(stateLoss, 1, { action: 'declare_66' });
  assert.strictEqual(resLoss.roundEnded, true);
  // Opponent had 0 tricks at closing, so opponent gets 3 points! (7 - 3 = 4)
  assert.strictEqual(resLoss.state.players[0]!.score, 7 - 3, 'Opponent scores 3 points on failed Zudrehen when opponent had 0 tricks');

  // CASE 1C: Closer lost when opponent had at least 1 trick at closing -> Opponent gets 2 points
  const stateLoss2 = engine.createInitialState(
    'test-zudrehen-loss-2',
    'ZUD003',
    5,
    [
      { userId: 'u0', username: 'P0_Dealer', isBot: false },
      { userId: 'u1', username: 'P1_Vorhand', isBot: false },
    ],
  );
  stateLoss2.trickHistory = [
    { trickNumber: 1, leadSeat: 1, winnerSeat: 0, cards: [], points: 10 },
    { trickNumber: 2, leadSeat: 0, winnerSeat: 1, cards: [], points: 10 },
  ];
  stateLoss2.players[1]!.tricksWon = 1;
  stateLoss2.players[0]!.tricksWon = 1; // Opponent had 1 trick at closing!
  stateLoss2.currentTurnSeat = 1;
  stateLoss2.currentTrick = [];
  engine.handleSchnapsenAction(stateLoss2, 1, { action: 'close_talon' });

  stateLoss2.schnapsenState!.playerEyes[1] = 40;
  const resLoss2 = engine.handleSchnapsenAction(stateLoss2, 1, { action: 'declare_66' });
  assert.strictEqual(resLoss2.roundEnded, true);
  // Opponent had >= 1 trick, so gets 2 points! (7 - 2 = 5)
  assert.strictEqual(resLoss2.state.players[0]!.score, 7 - 2, 'Opponent scores 2 points on failed Zudrehen when opponent had >= 1 trick');
});

test('2. Vorhand-Ansage im 1. Stich ohne späteren Stichgewinn (Punkte verfallen)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'test-vorhand-marr',
    'MARR001',
    5,
    [
      { userId: 'u0', username: 'P0_Dealer', isBot: false },
      { userId: 'u1', username: 'P1_Vorhand', isBot: false },
    ],
  );

  const trumpSuit = state.schnapsenState!.trumpSuit;
  // Vorhand (1) holds König and Ober in Trumpf
  state.hands[1] = [
    { id: `${trumpSuit}_7`, suit: trumpSuit, rank: 7, points: 4, name: 'König', shortName: 'K' },
    { id: `${trumpSuit}_6`, suit: trumpSuit, rank: 6, points: 3, name: 'Ober', shortName: 'O' },
  ];
  state.currentTurnSeat = 1;
  state.currentTrick = [];
  assert.strictEqual(state.trickHistory.length, 0, 'This is trick 1');

  // Vorhand announces 40er in trick 1
  engine.handleSchnapsenAction(state, 1, { action: 'announce_marriage', suit: trumpSuit });

  // Points should NOT be credited yet!
  assert.strictEqual(state.schnapsenState!.playerEyes[1], 0, 'Vorhand 40er points in trick 1 must not be added before winning a trick');
  assert.strictEqual(state.schnapsenState!.firstTrickVorhandMarriageSuit, trumpSuit);

  // Vorhand plays Ober (3 points)
  engine.handlePlayCard(state, 1, `${trumpSuit}_6`);

  // Dealer plays Ass (11 points) in Trumpf -> Dealer wins trick 1!
  state.hands[0] = [
    { id: `${trumpSuit}_9`, suit: trumpSuit, rank: 9, points: 11, name: 'Ass', shortName: 'A' },
  ];
  const trickRes = engine.handlePlayCard(state, 0, `${trumpSuit}_9`);
  assert.strictEqual(trickRes.trickCompleted, true);

  // Vorhand did NOT win the trick: marriage points remain 0!
  assert.strictEqual(state.schnapsenState!.playerEyes[1], 0, 'Vorhand points remain 0 because dealer won trick');
  assert.strictEqual(state.schnapsenState!.firstTrickVorhandMarriageSuit, trumpSuit, 'Marriage points are still pending a trick win');
});

test('3. Ass-Abwertung beim Zehnerloch (10 > König > Dame > Bube > Ass)', () => {
  // Test strength comparison directly in SchnapsenMoveValidator
  assert.strictEqual(
    SchnapsenMoveValidator.getRankStrength(8, true), // 10er
    8,
  );
  assert.strictEqual(
    SchnapsenMoveValidator.getRankStrength(7, true), // König
    7,
  );
  assert.strictEqual(
    SchnapsenMoveValidator.getRankStrength(6, true), // Dame
    6,
  );
  assert.strictEqual(
    SchnapsenMoveValidator.getRankStrength(5, true), // Bube
    5,
  );
  assert.strictEqual(
    SchnapsenMoveValidator.getRankStrength(9, true), // Ass
    4,
    'In Zehnerloch, Ace strength must be 4 (lower than Bube)',
  );

  // Verify: 10 beats Ass in Zehnerloch!
  const eichel10: Card = { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' };
  const eichelAss: Card = { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' };

  const winCard = SchnapsenMoveValidator.getWinningCard(
    [
      { seatIndex: 0, card: eichelAss },
      { seatIndex: 1, card: eichel10 },
    ],
    null, // No trump in Zehnerloch
    true, // isZehnerloch
  );
  assert.strictEqual(winCard?.seatIndex, 1, '10er must beat Ass in Zehnerloch');

  // Verify Stichzwang in Zehnerloch:
  // If lead is Eichel Bube (rank 5), and player holds Eichel Ass (rank 9) and Eichel 10 (rank 8):
  // Since 10 > Bube, but Ass < Bube in Zehnerloch, Stichzwang FORCES player to play Eichel 10!
  const eichelBube: Card = { id: 'EICHEL_5', suit: 'EICHEL', rank: 5, points: 2, name: 'Eichel Bube', shortName: 'U' };
  const legalCards = SchnapsenMoveValidator.getLegalCards(
    [eichelAss, eichel10],
    [{ seatIndex: 0, card: eichelBube }],
    'TALON_CLOSED',
    null,
    'ZEHNERLOCH',
  );
  assert.strictEqual(legalCards.length, 1);
  assert.strictEqual(legalCards[0]!.id, 'EICHEL_8', 'Player must play 10 to beat Bube due to Stichzwang in Zehnerloch');
});

test('4. Punktegutschrift für beide Gegner bei Verlust im Dreierschnapsen', () => {
  const engine = new SchnapsenEngine('schnapsen_3');
  const state = engine.createInitialState(
    'test-3p-loss',
    '3PLOSS01',
    5,
    [
      { userId: 'u0', username: 'P0_Declarer', isBot: false },
      { userId: 'u1', username: 'P1_Defender', isBot: true },
      { userId: 'u2', username: 'P2_Defender', isBot: true },
    ],
  );

  // Starting scores must be 24 for all 3 players
  assert.strictEqual(state.players[0]!.score, 24);
  assert.strictEqual(state.players[1]!.score, 24);
  assert.strictEqual(state.players[2]!.score, 24);

  // Declarer (0) plays Zehnerloch (10 points)
  state.schnapsenState!.callType = 'ZEHNERLOCH';
  state.declarerSeat = 0;
  state.schnapsenState!.schnapsenPhase = 'TRICK_PLAY';
  state.phase = 'TRICK_PLAY';
  state.currentTurnSeat = 0;
  state.currentTrick = [];

  // Declarer loses a trick in Zehnerloch -> Declarer immediately loses the contract (10 points)!
  state.hands[0] = [{ id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Bube', shortName: 'U' }];
  state.hands[1] = [{ id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10', shortName: '10' }]; // wins!
  state.hands[2] = [{ id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Dame', shortName: 'O' }];

  engine.handlePlayCard(state, 0, 'HERZ_5');
  engine.handlePlayCard(state, 1, 'HERZ_8');
  const res = engine.handlePlayCard(state, 2, 'HERZ_6');

  assert.strictEqual(res.roundEnded, true);
  // BOTH OPPONENTS SUBTRACT THE FULL 10 POINTS EACH! (24 - 10 = 14)
  assert.strictEqual(res.state.players[1]!.score, 14, 'Opponent 1 subtracts full 10 points');
  assert.strictEqual(res.state.players[2]!.score, 14, 'Opponent 2 subtracts full 10 points');
  assert.strictEqual(res.state.players[0]!.score, 24, 'Declarer remains at 24 points');
});

test('5. 3 Buben in ersten 3 Karten erlaubt Neu-Geben', () => {
  const engine = new SchnapsenEngine('schnapsen_4');
  const state = engine.createInitialState(
    'test-3-buben',
    'BUBEN3',
    5,
    [
      { userId: 'u0', username: 'P0', isBot: false },
      { userId: 'u1', username: 'P1_Vorhand', isBot: false },
      { userId: 'u2', username: 'P2', isBot: false },
      { userId: 'u3', username: 'P3', isBot: false },
    ],
  );

  // Give Vorhand (seat 1) 3 Buben in first 3 cards
  state.hands[1] = [
    { id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Bube', shortName: 'U' },
    { id: 'SCHELL_5', suit: 'SCHELL', rank: 5, points: 2, name: 'Schell Bube', shortName: 'U' },
    { id: 'LAUB_5', suit: 'LAUB', rank: 5, points: 2, name: 'Laub Bube', shortName: 'U' },
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' },
  ];
  state.schnapsenState!.atoutSelection = {
    first3Cards: state.hands[1].slice(0, 3),
    canRedeal3Buben: true,
    step: 'FIRST_3',
  };

  const special = SchnapsenMoveValidator.getAvailableSpecialActions(state, 1);
  assert.strictEqual(special.canRedeal3Buben, true);

  // Action redeals round cleanly
  const res = engine.handleSchnapsenAction(state, 1, { action: 'redeal_3_buben' });
  assert.strictEqual(res.roundEnded, false);
  assert.strictEqual(res.state.hands[1]!.length, 5);
});

test('6. Atout-Bube austauschen (Unter/Bube mit offener Trumpfkarte)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'test-swap-jack',
    'SWAP01',
    5,
    [
      { userId: 'u0', username: 'P0', isBot: false },
      { userId: 'u1', username: 'P1', isBot: false },
    ],
  );

  const trumpSuit = state.schnapsenState!.trumpSuit;
  const initialTrumpCard = state.schnapsenState!.trumpCard!;

  // Give Player 1 the Atout Jack
  const trumpJack: Card = {
    id: `${trumpSuit}_5`,
    suit: trumpSuit,
    rank: 5,
    points: 2,
    name: 'Atout Bube',
    shortName: 'U',
  };
  state.hands[1] = [trumpJack];
  state.currentTurnSeat = 1;
  state.currentTrick = [];

  const special = SchnapsenMoveValidator.getAvailableSpecialActions(state, 1);
  assert.strictEqual(special.canSwapAtoutJack, true);

  // Perform swap
  engine.handleSchnapsenAction(state, 1, { action: 'swap_trump' });

  // Player now holds the initial trumpCard in hand, and open trump is the Jack
  assert.ok(state.hands[1]!.some((c) => c.id === initialTrumpCard.id));
  assert.strictEqual(state.schnapsenState!.trumpCard?.rank, 5);
});

test('7. Kontra-Multiplikatoren (Normal 1x, Gespritzt 2x, Zruckgspritzt 4x, Nochmals 8x)', () => {
  const engine = new SchnapsenEngine('schnapsen_4');
  const state = engine.createInitialState(
    'test-kontra',
    'KONTRA01',
    5,
    [
      { userId: 'u0', username: 'P0_TeamA', isBot: false },
      { userId: 'u1', username: 'P1_TeamB', isBot: false },
      { userId: 'u2', username: 'P2_TeamA', isBot: false },
      { userId: 'u3', username: 'P3_TeamB', isBot: false },
    ],
  );

  // Vorhand (1) selects Atout and bids RUFER
  engine.handleSchnapsenAction(state, 1, { action: 'select_atout', suit: 'HERZ' });
  assert.strictEqual(state.schnapsenState!.kontraLevel, 1);
  assert.strictEqual(state.currentTurnSeat, 2); // Team A

  // Seat 2 (Team A, partner of seat 0) passes
  engine.handleSchnapsenAction(state, 2, { action: 'pass' });

  // Seat 3 (Team B) passes
  engine.handleSchnapsenAction(state, 3, { action: 'pass' });

  // Seat 0 (Team A) sprits / kontras the Vorhand (Team B)!
  engine.handleSchnapsenAction(state, 0, { action: 'kontra' });
  assert.strictEqual(state.schnapsenState!.kontraLevel, 2, 'Gespritzt must be 2x');

  // Seat 1 (Team B) zruckspritzt (Re)!
  engine.handleSchnapsenAction(state, 1, { action: 'kontra' });
  assert.strictEqual(state.schnapsenState!.kontraLevel, 4, 'Zruckgspritzt must be 4x');

  // Seat 2 (Team A) nochmals (Sub)!
  engine.handleSchnapsenAction(state, 2, { action: 'kontra' });
  assert.strictEqual(state.schnapsenState!.kontraLevel, 8, 'Nochmals must be 8x');
});

test('8. Schneider-Bummerl (Verlierer steht noch auf Startpunktzahl 7 bzw. 24 -> doppeltes Bummerl)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'test-schneider',
    'SCHNEIDER1',
    5,
    [
      { userId: 'u0', username: 'P0', isBot: false },
      { userId: 'u1', username: 'P1', isBot: false },
    ],
  );

  // P1 starts at 7 and wins 7 points in a row down to 0
  state.players[1]!.score = 7;
  state.players[0]!.score = 7; // P0 never scored anything and is still on full 7 points!

  const matchRes = engine.computeMatchResult({
    ...state,
    players: [
      { ...state.players[0]!, score: 7 },
      { ...state.players[1]!, score: 0 },
    ],
  });

  assert.strictEqual(matchRes.isSchneider, true, 'Must detect Schneider when loser is still on full start points');
});
