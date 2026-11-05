import assert from 'node:assert';
import test from 'node:test';
import { Card, CardRank } from '@spielfranzen/shared';
import { EngineRouter } from './EngineRouter.js';
import { SchnapsenBotAI } from './SchnapsenBotAI.js';
import { SchnapsenEngine } from './SchnapsenEngine.js';
import { WattenBotAI } from './WattenBotAI.js';
import { WattenEngine } from './WattenEngine.js';

test('WattenEngine 1: Initial state for 2 players deals 5 cards each and starts in BIDDING phase', () => {
  const players = [
    { userId: 'u0', username: 'Florian', isBot: false },
    { userId: 'u1', username: 'Hansi', isBot: true },
  ];

  const state = EngineRouter.createInitialState(
    'watten_2',
    'watten-test-1',
    'WATT01',
    5,
    players,
    undefined,
    true,
    'Watten Duell',
  );

  assert.strictEqual(state.gameType, 'watten_2');
  assert.strictEqual(state.maxPlayers, 2);
  assert.strictEqual(state.players.length, 2);
  assert.strictEqual(state.hands[0]!.length, 5);
  assert.strictEqual(state.hands[1]!.length, 5);
  assert.strictEqual(state.phase, 'BIDDING');
  assert.ok(state.wattenState);
  assert.strictEqual(state.wattenState?.currentBet, 2);
  assert.ok(state.wattenState?.cutCard, 'Cut card must be visible from deck bottom');

  // Vorhand is seat 1 (dealer + 1), Geber is seat 0
  const wattenEngine = EngineRouter.getEngine('watten_2') as WattenEngine;
  assert.strictEqual(state.wattenState?.schlagChooserSeat, 1);
  assert.strictEqual(state.wattenState?.farbeChooserSeat, 0);

  // Vorhand cannot announce Weli (rank 1) as Schlag
  assert.throws(
    () => wattenEngine.handleWattenAnnounce(state, 1, { schlag: 1 as CardRank }),
    /Ungültiger Schlag/,
  );

  // Vorhand announces Schlag (Ass = 9)
  wattenEngine.handleWattenAnnounce(state, 1, { schlag: 9 });
  assert.strictEqual(state.wattenState?.schlag, 9);
  assert.strictEqual(state.currentTurnSeat, 0); // Passes to Geber

  // Geber announces Farbe (Herz)
  wattenEngine.handleWattenAnnounce(state, 0, { farbe: 'HERZ' });
  assert.strictEqual(state.wattenState?.farbe, 'HERZ');
  assert.strictEqual(state.phase, 'TRICK_PLAY');
  assert.strictEqual(state.trickLeadSeat, 1, 'Vorhand must lead trick 1');
});

test('WattenEngine 2: "Der Guete" calculation & Ass wrap-around theorem', () => {
  // If Schlag is 7 (2) -> Gueter is 8 (3)
  assert.strictEqual(WattenEngine.getGueterRank(2), 3);
  // If Schlag is 8 (3) -> Gueter is 9 (4)
  assert.strictEqual(WattenEngine.getGueterRank(3), 4);
  // If Schlag is 9 (4) -> Gueter is 10 (8)
  assert.strictEqual(WattenEngine.getGueterRank(4), 8);
  // If Schlag is 10 (8) -> Gueter is Unter (5)
  assert.strictEqual(WattenEngine.getGueterRank(8), 5);
  // If Schlag is Unter (5) -> Gueter is Ober (6)
  assert.strictEqual(WattenEngine.getGueterRank(5), 6);
  // If Schlag is Ober (6) -> Gueter is König (7)
  assert.strictEqual(WattenEngine.getGueterRank(6), 7);
  // If Schlag is König (7) -> Gueter is Ass (9)
  assert.strictEqual(WattenEngine.getGueterRank(7), 9);
  // Ass wrap-around theorem: If Schlag is Ass (9) -> Gueter wraps around to Trumpf-7 (2)!
  assert.strictEqual(WattenEngine.getGueterRank(9), 2);
  // Weli as Schlag: alone at top
  assert.strictEqual(WattenEngine.getGueterRank(1, false), null);
});

test('WattenEngine 3: Card power hierarchy (Gueter > Rechter > Schläge > Trümpfe > Angespielt > Fremd)', () => {
  const engine = new WattenEngine('watten_2');
  const mockState = {
    schlag: 6 as CardRank, // Ober is Schlag
    farbe: 'LAUB' as const, // Laub is Trumpf
    schlagChooserSeat: 0,
    farbeChooserSeat: 1,
    currentBet: 2,
    betChallengerSeat: null,
    betPending: false,
    teamTricksWon: [0, 0] as [number, number],
    mode: 'OFFEN' as const,
  };

  // Schlag is Ober, Trumpf is Laub:
  // Gueter: Laub König (Schlag Ober + 1 in Trumpf)
  const gueter: Card = { id: 'LAUB_7', suit: 'LAUB', rank: 7, points: 4, name: 'Laub König', shortName: 'K' };
  // Rechter: Laub Ober
  const rechter: Card = { id: 'LAUB_6', suit: 'LAUB', rank: 6, points: 3, name: 'Laub Ober', shortName: 'O' };
  // Weitere Schläge: Herz Ober, Eichel Ober, Schell Ober
  const weitererSchlag: Card = { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' };
  // Normaler Trumpf: Laub Ass
  const trumpfAss: Card = { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' };
  // Angespielte Farbe: Herz Ass (wenn Herz angespielt wurde)
  const leadCard: Card = { id: 'HERZ_3', suit: 'HERZ', rank: 3, points: 0, name: 'Herz 8', shortName: '8' };
  const herzAss: Card = { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' };
  // Fremde Farbe: Eichel Ass
  const eichelAss: Card = { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' };

  const pGueter = engine.getCardPower(gueter, leadCard, mockState);
  const pRechter = engine.getCardPower(rechter, leadCard, mockState);
  const pSchlag = engine.getCardPower(weitererSchlag, leadCard, mockState);
  const pTrumpf = engine.getCardPower(trumpfAss, leadCard, mockState);
  const pAngespielt = engine.getCardPower(herzAss, leadCard, mockState);
  const pFremd = engine.getCardPower(eichelAss, leadCard, mockState);

  assert.ok(pGueter > pRechter, 'Gueter must beat Rechter');
  assert.ok(pRechter > pSchlag, 'Rechter must beat Weitere Schläge');
  assert.ok(pSchlag > pTrumpf, 'Weitere Schläge must beat normal Trümpfe (even Trumpf Ass)');
  assert.ok(pTrumpf > pAngespielt, 'Normal Trümpfe must beat lead suit');
  assert.ok(pAngespielt > pFremd, 'Lead suit must beat foreign cards');
});

test('WattenEngine 4: Trumpfzwang rules on Trump lead with Rechter exemption', () => {
  const engine = new WattenEngine('watten_2');
  const mockState = engine.createInitialState(
    'watten-zwang',
    'ZWANG1',
    5,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  mockState.phase = 'TRICK_PLAY';
  mockState.wattenState!.schlag = 6; // Ober
  mockState.wattenState!.farbe = 'HERZ'; // Herz Trumpf

  // Player 0 leads a regular Trumpf (Herz 8)
  const leadCard: Card = { id: 'HERZ_3', suit: 'HERZ', rank: 3, points: 0, name: 'Herz 8', shortName: '8' };
  mockState.currentTrick = [{ seatIndex: 0, card: leadCard }];

  // Case A: Player 1 has regular Trumpf (Herz 9) and foreign cards
  mockState.hands[1] = [
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
  ];
  let legal = engine.getLegalCardsToPlay(mockState, 1);
  assert.strictEqual(legal.length, 1, 'Must serve regular trump');
  assert.strictEqual(legal[0]!.id, 'HERZ_4');

  // Case B: Player 1 has ONLY Der Rechte (Herz Ober) and foreign cards
  // Rechter is EXEMPT from Trumpfzwang!
  mockState.hands[1] = [
    { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' }, // Der Rechte
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
  ];
  legal = engine.getLegalCardsToPlay(mockState, 1);
  assert.strictEqual(legal.length, 2, 'Rechter is exempt; can play any card from hand');

  // Case C: Lead card is NON-TRUMP (Eichel 8) -> NO Farbzwang!
  mockState.currentTrick = [
    { seatIndex: 0, card: { id: 'EICHEL_3', suit: 'EICHEL', rank: 3, points: 0, name: 'Eichel 8', shortName: '8' } },
  ];
  legal = engine.getLegalCardsToPlay(mockState, 1);
  assert.strictEqual(legal.length, 2, 'No Farbzwang on non-trump lead');

  // Case D: Later trick (trick 2): Trumpf lead in subsequent tricks has NO Trumpfzwang!
  mockState.trickHistory = [
    { trickNumber: 1, leadSeat: 0, winnerSeat: 0, cards: [], points: 0 },
  ];
  mockState.currentTrick = [{ seatIndex: 0, card: leadCard }];
  mockState.hands[1] = [
    { id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' },
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7', shortName: '7' },
  ];
  legal = engine.getLegalCardsToPlay(mockState, 1);
  assert.strictEqual(legal.length, 2, 'No Trumpfzwang in tricks 2-5 even on Trump lead');
});

test('WattenEngine 5: 3 tricks immediately wins the round & Bieten/Folding logic', () => {
  const engine = new WattenEngine('watten_2');
  const state = engine.createInitialState(
    'watten-bieten',
    'BET01',
    5,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  state.phase = 'TRICK_PLAY';
  state.wattenState!.schlag = 9;
  state.wattenState!.farbe = 'LAUB';
  state.wattenState!.currentBet = 2;

  // Player 0 raises ("Schlagen auf 3 Punkte")
  engine.handleWattenBet(state, 0, 'bet');
  assert.strictEqual(state.wattenState!.currentBet, 3);
  assert.strictEqual(state.wattenState!.betPending, true);
  assert.strictEqual(state.wattenState!.betChallengerSeat, 0);

  // Player 1 counter-raises ("Drüberschlagen auf 4 Punkte")
  engine.handleWattenBet(state, 1, 'bet');
  assert.strictEqual(state.wattenState!.currentBet, 4);
  assert.strictEqual(state.wattenState!.betPending, true);
  assert.strictEqual(state.wattenState!.betChallengerSeat, 1);

  // Player 0 holds ("Halten bei 4 Punkten")
  engine.handleWattenBet(state, 0, 'hold');
  assert.strictEqual(state.wattenState!.currentBet, 4);
  assert.strictEqual(state.wattenState!.betPending, false);

  // Player 0 raises again to 5
  engine.handleWattenBet(state, 0, 'bet');
  assert.strictEqual(state.wattenState!.currentBet, 5);

  // Player 1 folds ("Gehen") -> Player 0's team wins previous bet (4 points) immediately!
  const foldRes = engine.handleWattenBet(state, 1, 'fold');
  assert.strictEqual(foldRes.roundEnded, true);
  assert.strictEqual(foldRes.state.players[0]!.score, 4, 'Challenger wins 4 points');
  assert.strictEqual(foldRes.state.phase, 'ROUND_SUMMARY');
});

test('WattenEngine 6: "Gestrichen" and "Es gehen die Vier" logic', () => {
  const engine = new WattenEngine('watten_2');
  const state = engine.createInitialState(
    'watten-gestrichen',
    'GEST01',
    5,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  // Set scores: Team 0 has 13 points (gestrichen at 15), Team 1 has 8 points (gap = 5 >= 4)
  state.players[0]!.score = 13;
  state.players[1]!.score = 8;

  // Start new round
  engine.startNewRound(state);
  assert.strictEqual(state.wattenState!.esGehenDieVier, true, 'Es gehen die Vier must trigger');
  assert.strictEqual(state.wattenState!.currentBet, 4, 'Round starts worth 4 points');
  assert.strictEqual(state.wattenState!.esGehenDieVierPendingTeam, 0, 'Gestrichen team must decide');

  // Gestrichen team folds -> opponent gets 2 points
  const res = engine.handleWattenBet(state, 0, 'fold');
  assert.strictEqual(res.roundEnded, true);
  assert.strictEqual(res.state.players[1]!.score, 10, 'Opponent receives 2 points on voluntary fold');
});

test('WattenBotAI: 4-player team awareness (Never needlessly overtakes partner)', () => {
  const engine = new WattenEngine('watten_4');
  const state = engine.createInitialState(
    'watten-bot-test',
    'WBOT01',
    5,
    [
      { userId: 'u0', username: 'TeamA_Human', isBot: false },
      { userId: 'u1', username: 'TeamB_Opp1', isBot: true },
      { userId: 'u2', username: 'TeamA_BotPartner', isBot: true },
      { userId: 'u3', username: 'TeamB_Opp2', isBot: true },
    ],
  );

  state.phase = 'TRICK_PLAY';
  state.wattenState!.schlag = 7; // König
  state.wattenState!.farbe = 'HERZ'; // Herz

  // Partner (seat 0) leads the trick with Herz König (Der Rechte! Power 8000)
  const partnerCard: Card = { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' };
  // Opponent 1 (seat 1) plays a low card (Herz 8, power 5003)
  const opp1Card: Card = { id: 'HERZ_3', suit: 'HERZ', rank: 3, points: 0, name: 'Herz 8', shortName: '8' };

  state.currentTrick = [
    { seatIndex: 0, card: partnerCard },
    { seatIndex: 1, card: opp1Card },
  ];
  state.currentTurnSeat = 2; // Bot Partner's turn (seat 2, Team A)

  // Bot partner holds Der Guete (Herz Ass, power 9000) AND a useless card (Eichel 8, power 1003)
  const gueter: Card = { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' };
  const useless: Card = { id: 'EICHEL_3', suit: 'EICHEL', rank: 3, points: 0, name: 'Eichel 8', shortName: '8' };
  state.hands[2] = [gueter, useless];

  // Bot decides what to play
  const chosenCardId = WattenBotAI.decideCardToPlay(state, 2, engine);

  // BOT MUST NOT OVERTAKE PARTNER! Bot should discard the useless card, saving the Gueter!
  assert.strictEqual(
    chosenCardId,
    useless.id,
    'Bot must not overtake partner holding the winning Rechte; must discard useless card',
  );
});

test('WattenBotAI: 2-player bidding decision (hold, fold, counter-raise, proactive bet)', () => {
  const engine = new WattenEngine('watten_2');
  const state = engine.createInitialState(
    'watten-bot-bidding',
    'WBB01',
    5,
    [
      { userId: 'u0', username: 'Human', isBot: false },
      { userId: 'u1', username: 'Bot', isBot: true },
    ],
  );

  state.phase = 'TRICK_PLAY';
  state.wattenState!.schlag = 7; // König
  state.wattenState!.farbe = 'HERZ'; // Trumpf = Herz
  state.wattenState!.currentBet = 2;

  // Case 1: Bot holds strong hand (Rechter + Gueter), opponent raises to 3
  state.wattenState!.betPending = true;
  state.wattenState!.betChallengerSeat = 0; // Human raised to 3
  state.wattenState!.currentBet = 3;

  const rechter: Card = { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' };
  const gueter: Card = { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' };
  state.hands[1] = [rechter, gueter];

  let decision = WattenBotAI.decideBetAction(state, 1, engine);
  assert.strictEqual(decision.action, 'bet', 'Bot with monster hand counter-raises (Drüberschlagen)!');

  // Case 2: Bot holds average hand (strength >= 2.0, e.g. 1 Schlag), opponent raises
  const schlagEichel: Card = { id: 'EICHEL_7', suit: 'EICHEL', rank: 7, points: 4, name: 'Eichel König', shortName: 'K' };
  const junk: Card = { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7', shortName: '7' };
  state.hands[1] = [schlagEichel, junk];

  decision = WattenBotAI.decideBetAction(state, 1, engine);
  assert.strictEqual(decision.action, 'hold', 'Bot with decent hand (Schlag) holds the bet');

  // Case 3: Bot holds complete junk (strength < 2.0, 0 tricks won), opponent raises
  state.hands[1] = [junk];
  decision = WattenBotAI.decideBetAction(state, 1, engine);
  assert.strictEqual(decision.action, 'fold', 'Bot with no trumps or schläge folds when challenged');

  // Case 4: No pending bet, Bot holds Rechter (strength >= 4.0) -> Proactively initiates bet
  state.wattenState!.betPending = false;
  state.wattenState!.betChallengerSeat = null;
  state.wattenState!.lastBettingTeam = null;
  state.wattenState!.currentBet = 2;
  state.hands[1] = [rechter, junk];

  decision = WattenBotAI.decideBetAction(state, 1, engine);
  assert.strictEqual(decision.action, 'bet', 'Bot proactively raises ("Schlagen auf 3") with strong cards');
});

test('SchnapsenEngine 1: 2er-Schnapsen deals 5 cards each and reveals trump card on talon', () => {
  const players = [
    { userId: 'u0', username: 'Florian', isBot: false },
    { userId: 'u1', username: 'Resi', isBot: true },
  ];

  const state = EngineRouter.createInitialState(
    'schnapsen_2',
    'schnapsen-test-1',
    'SCHN01',
    3,
    players,
  );

  assert.strictEqual(state.gameType, 'schnapsen_2');
  assert.strictEqual(state.maxPlayers, 2);
  assert.strictEqual(state.hands[0]!.length, 5);
  assert.strictEqual(state.hands[1]!.length, 5);
  assert.ok(state.schnapsenState);
  assert.ok(state.schnapsenState?.trumpCard);
  assert.strictEqual(state.schnapsenState?.stockCount, 10);
  assert.strictEqual(state.phase, 'TRICK_PLAY');
});

test('SchnapsenEngine 2: Trump swap with Trumpf-Unter (rank 5)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'schnapsen-swap',
    'SWAP01',
    3,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  const trumpSuit = state.schnapsenState!.trumpSuit;
  const originalTrumpCard = state.schnapsenState!.trumpCard!;

  // Give Player 1 (lead player) the Trumpf-Unter (rank 5)
  const trumpUnter: Card = {
    id: `${trumpSuit}_5`,
    suit: trumpSuit,
    rank: 5,
    points: 2,
    name: `${trumpSuit} Unter`,
    shortName: 'U',
  };
  state.hands[1] = [trumpUnter];
  state.currentTurnSeat = 1;
  state.currentTrick = [];

  // Swap trump
  engine.handleSchnapsenAction(state, 1, { action: 'swap_trump' });

  // Now trumpCard on table is the Unter, and player holds original trump card
  assert.strictEqual(state.schnapsenState!.trumpCard?.rank, 5);
  assert.ok(state.hands[1]!.some((c) => c.id === originalTrumpCard.id));
});

test('SchnapsenEngine 3: Marriage announcement (20er and 40er)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'schnapsen-marriage',
    'MARR01',
    3,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  const trumpSuit = state.schnapsenState!.trumpSuit;
  // Make it after 1st trick so points are counted immediately
  state.trickHistory = [
    { trickNumber: 1, leadSeat: 1, winnerSeat: 1, cards: [], points: 10 },
  ];
  state.players[1]!.tricksWon = 1;

  // Give Player 1 both King (rank 7) and Ober (rank 6) in Trumpf
  state.hands[1] = [
    { id: `${trumpSuit}_7`, suit: trumpSuit, rank: 7, points: 4, name: 'König', shortName: 'K' },
    { id: `${trumpSuit}_6`, suit: trumpSuit, rank: 6, points: 3, name: 'Ober', shortName: 'O' },
  ];
  state.currentTurnSeat = 1;
  state.currentTrick = [];

  // Announce 40er in Trumpf
  engine.handleSchnapsenAction(state, 1, { action: 'announce_marriage', suit: trumpSuit });

  assert.strictEqual(state.schnapsenState!.playerEyes[1], 40, '40er must add 40 eyes');
  assert.strictEqual(state.schnapsenState!.marriages.length, 1);
  assert.strictEqual(state.schnapsenState!.marriages[0]!.points, 40);
});

test('SchnapsenEngine 4: Talon closing ("Zudrehen") triggers strict Farb- und Stichzwang', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const state = engine.createInitialState(
    'schnapsen-close',
    'CLOSE01',
    3,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: false },
    ],
  );

  // Zudrehen earliest after 1st trick
  state.trickHistory = [
    { trickNumber: 1, leadSeat: 1, winnerSeat: 1, cards: [], points: 10 },
  ];
  state.players[1]!.tricksWon = 1;
  state.currentTurnSeat = 1;
  state.currentTrick = [];

  // Close talon
  engine.handleSchnapsenAction(state, 1, { action: 'close_talon' });
  assert.strictEqual(state.schnapsenState!.talonClosed, true);
  assert.strictEqual(state.schnapsenState!.talonClosedBySeat, 1);

  // Player 1 leads Eichel 10 (rank 8)
  const eichel10: Card = { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' };
  state.currentTrick = [{ seatIndex: 1, card: eichel10 }];

  // Player 0 holds Eichel Ass (rank 9) and Eichel Unter (rank 5)
  state.hands[0] = [
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'EICHEL_5', suit: 'EICHEL', rank: 5, points: 2, name: 'Eichel Unter', shortName: 'U' },
  ];

  // Strict Stichzwang: Must take trick with Eichel Ass! Eichel Unter is illegal
  const legal = engine.getLegalCardsToPlay(state, 0);
  assert.strictEqual(legal.length, 1);
  assert.strictEqual(legal[0]!.id, 'EICHEL_9', 'Must take trick with Eichel Ass due to Stichzwang');
});

test('SchnapsenEngine 5: 3er-Schnapsen deals 6 cards each (2 in talon) and supports Bettler', () => {
  const engine = new SchnapsenEngine('schnapsen_3');
  const state = engine.createInitialState(
    'schnapsen-3p',
    'SCHN3P',
    5,
    [
      { userId: 'u0', username: 'P1', isBot: false },
      { userId: 'u1', username: 'P2', isBot: true },
      { userId: 'u2', username: 'P3', isBot: true },
    ],
  );

  assert.strictEqual(state.gameType, 'schnapsen_3');
  assert.strictEqual(state.maxPlayers, 3);
  assert.strictEqual(state.hands[0]!.length, 6);
  assert.strictEqual(state.hands[1]!.length, 6);
  assert.strictEqual(state.hands[2]!.length, 6);
  assert.strictEqual(state.talon.length, 2);

  // Set call to BETTLER (Declarer loses if they win a single trick!)
  state.schnapsenState!.callType = 'BETTLER';
  state.declarerSeat = 0;
  state.schnapsenState!.schnapsenPhase = 'TRICK_PLAY';
  state.phase = 'TRICK_PLAY';
  state.currentTrick = [];
  state.currentTurnSeat = 0;

  // Declarer takes a trick
  state.hands[0] = [{ id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' }];
  state.hands[1] = [{ id: 'HERZ_5', suit: 'HERZ', rank: 5, points: 2, name: 'Herz Unter', shortName: 'U' }];
  state.hands[2] = [{ id: 'HERZ_4', suit: 'HERZ', rank: 4, points: 0, name: 'Herz 9', shortName: '9' }];

  engine.handlePlayCard(state, 0, 'HERZ_9');
  engine.handlePlayCard(state, 1, 'HERZ_5');
  const res = engine.handlePlayCard(state, 2, 'HERZ_4');

  // Trick completed: Declarer won a trick in Bettler -> Defenders win immediately (5 points)!
  assert.strictEqual(res.trickCompleted, true);
  assert.strictEqual(res.roundEnded, true);
  // Both opponents subtract 5 points each in Dreierschnapsen! (24 - 5 = 19)
  assert.strictEqual(res.state.players[1]!.score, 19, 'Opponent 1 subtracts 5 points');
  assert.strictEqual(res.state.players[2]!.score, 19, 'Opponent 2 subtracts 5 points');
});

test('Watten Options: Target scores 11, 15, 18 and Gestrichen thresholds', () => {
  const engine = new WattenEngine('watten_2');
  const players = [
    { userId: 'u0', username: 'A', isBot: false },
    { userId: 'u1', username: 'B', isBot: true },
  ];

  // 11 points target: gestrichen at 9
  const state11 = engine.createInitialState('w-11', 'W11', 10, players, undefined, true, undefined, {
    targetScore: 11,
    hasGueter: true,
    hasSupergueter: false,
    weliRole: 'kleinster_trumpf',
  });
  assert.strictEqual(state11.wattenState!.targetScore, 11);
  state11.players[0]!.score = 9;
  const next11 = engine.startNewRound(state11);
  assert.strictEqual(next11.wattenState!.isGestrichen![0], true, 'Team 0 is gestrichen at 9 points for target 11');
  assert.strictEqual(next11.wattenState!.isGestrichen![1], false);

  // 18 points target: gestrichen at 16
  const state18 = engine.createInitialState('w-18', 'W18', 10, players, undefined, true, undefined, {
    targetScore: 18,
    hasGueter: true,
    hasSupergueter: false,
    weliRole: 'kleinster_trumpf',
  });
  assert.strictEqual(state18.wattenState!.targetScore, 18);
  state18.players[0]!.score = 15;
  const next18 = engine.startNewRound(state18);
  assert.strictEqual(next18.wattenState!.isGestrichen![0], false, 'Team 0 is NOT gestrichen at 15 for target 18');
  state18.players[0]!.score = 16;
  const next18b = engine.startNewRound(state18);
  assert.strictEqual(next18b.wattenState!.isGestrichen![0], true, 'Team 0 IS gestrichen at 16 for target 18');
});

test('Watten Options: Superguater calculation, power hierarchy and exemption', () => {
  // Superguater calculation:
  // Schlag Ass(9) -> Guater 7(2) -> Superguater 8(3)
  assert.strictEqual(WattenEngine.getSupergueterRank(9), 3);
  // Schlag König(7) -> Guater Ass(9) -> Superguater 7(2)
  assert.strictEqual(WattenEngine.getSupergueterRank(7), 2);
  // Schlag 7(2) -> Guater 8(3) -> Superguater 9(4)
  assert.strictEqual(WattenEngine.getSupergueterRank(2), 4);

  const engine = new WattenEngine('watten_2');
  const wsWithSuper: WattenState = {
    schlag: 7, // König
    farbe: 'HERZ',
    schlagChooserSeat: 0,
    farbeChooserSeat: 1,
    currentBet: 2,
    betChallengerSeat: null,
    betPending: false,
    teamTricksWon: [0, 0],
    mode: 'OFFEN',
    hasGueter: true,
    hasSupergueter: true,
    weliRole: 'kleinster_trumpf',
  };

  const herz7: Card = { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' }; // Superguater!
  const herzA: Card = { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' }; // Guater!
  const herzK: Card = { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' }; // Rechter!
  const eichelK: Card = { id: 'EICHEL_7', suit: 'EICHEL', rank: 7, points: 4, name: 'Eichel König', shortName: 'K' }; // Schlag!
  const herzO: Card = { id: 'HERZ_6', suit: 'HERZ', rank: 6, points: 3, name: 'Herz Ober', shortName: 'O' }; // Trumpf!

  const powerSuper = engine.getCardPower(herz7, null, wsWithSuper);
  const powerGuater = engine.getCardPower(herzA, null, wsWithSuper);
  const powerRechter = engine.getCardPower(herzK, null, wsWithSuper);
  const powerSchlag = engine.getCardPower(eichelK, null, wsWithSuper);
  const powerTrumpf = engine.getCardPower(herzO, null, wsWithSuper);

  assert.strictEqual(powerSuper, 9500, 'Superguater has power 9500');
  assert.strictEqual(powerGuater, 9000, 'Guater has power 9000');
  assert.strictEqual(powerRechter, 8000, 'Rechter has power 8000');
  assert.strictEqual(powerSchlag, 7000, 'Other Schlag has power 7000');
  assert.ok(powerSuper > powerGuater);
  assert.ok(powerGuater > powerRechter);
  assert.ok(powerRechter > powerSchlag);
  assert.ok(powerSchlag > powerTrumpf);

  // Superguater is exempt from forced play on trump lead
  assert.strictEqual(engine.isExemptTrumpf(herz7, wsWithSuper), true, 'Superguater is exempt');
  assert.strictEqual(engine.isExemptTrumpf(herzA, wsWithSuper), true, 'Guater is exempt');
  assert.strictEqual(engine.isExemptTrumpf(herzO, wsWithSuper), false, 'Normal trump Ober is NOT exempt');

  // When hasSupergueter is false, herz 7 is just a normal trump (5000 + 2 = 5002)
  const wsWithoutSuper: WattenState = { ...wsWithSuper, hasSupergueter: false };
  assert.strictEqual(engine.getCardPower(herz7, null, wsWithoutSuper), 5002);
});

test('Watten Options: Weli role (kleinster_trumpf vs kleinster_schell)', () => {
  const engine = new WattenEngine('watten_2');
  const weliCard: Card = { id: 'SCHELL_WELI', suit: 'SCHELL', rank: 1, points: 0, name: 'Schell Weli', shortName: 'W' };

  // Case 1: Trumpf is HERZ, weliRole is 'kleinster_trumpf'
  const wsTrumpfWeli: WattenState = {
    schlag: 6,
    farbe: 'HERZ',
    schlagChooserSeat: 0,
    farbeChooserSeat: 1,
    currentBet: 2,
    betChallengerSeat: null,
    betPending: false,
    teamTricksWon: [0, 0],
    weliRole: 'kleinster_trumpf',
  };
  assert.strictEqual(engine.isTrumpfCard(weliCard, wsTrumpfWeli), true, 'Weli counts as trump even when trump is Herz');
  assert.strictEqual(engine.getCardPower(weliCard, null, wsTrumpfWeli), 5001, 'Weli power is 5001 (lowest trump)');

  // Case 2: Trumpf is HERZ, weliRole is 'kleinster_schell'
  const wsSchellWeli: WattenState = {
    ...wsTrumpfWeli,
    weliRole: 'kleinster_schell',
  };
  assert.strictEqual(engine.isTrumpfCard(weliCard, wsSchellWeli), false, 'Weli does NOT count as trump when trump is Herz and role is kleinster_schell');
  assert.strictEqual(engine.getCardPower(weliCard, null, wsSchellWeli), 1001, 'Weli has normal side-suit power');
});

test('Schnapsen Options: subMode3 MITSCHREIBEN_3P and targetBummerl match progression', () => {
  const engine = new SchnapsenEngine('schnapsen_3');
  const players = [
    { userId: 'u0', username: 'P1', isBot: false },
    { userId: 'u1', username: 'P2', isBot: true },
    { userId: 'u2', username: 'P3', isBot: true },
  ];

  // Initialize with MITSCHREIBEN_3P and targetBummerl: 2
  const state = engine.createInitialState('schn-mit', 'MIT3P', 50, players, undefined, true, undefined, {
    targetBummerl: 2,
    subMode3: 'MITSCHREIBEN_3P',
    allowZudrehen: false,
    allowTrumpfTausch: false,
    schneiderBummerl: true,
  });

  assert.strictEqual(state.schnapsenState!.mode, 'MITSCHREIBEN_3P');
  assert.strictEqual(state.players[0]!.score, 7, 'Starts at 7 for Mitschreiben');
  assert.strictEqual(state.players[1]!.score, 7);
  assert.strictEqual(state.players[2]!.score, 7);
  assert.strictEqual(state.schnapsenState!.allowZudrehen, false);
  assert.strictEqual(state.schnapsenState!.allowTrumpfTausch, false);

  // Non-winning players have written points (5 score remaining instead of initial 7) -> No Schneider!
  state.players[0]!.score = 5;
  state.players[2]!.score = 5;
  // Player 1 wins round reducing score from 7 to 0 (wins 1st normal Bummerl!)
  state.players[1]!.score = 0;
  engine.finalizeSchnapsenRound(state, 1, 'P2 hat 66 Augen erreicht!', 2);

  // Since targetBummerl is 2, match is NOT yet complete!
  assert.strictEqual(state.phase, 'ROUND_SUMMARY', 'Match continues to next Bummerl');
  assert.strictEqual(state.schnapsenState!.bummerlsWon![1], 1, 'Player 1 won 1 Bummerl');
  assert.strictEqual(state.players[1]!.score, 7, 'Scores reset back to 7 for next Bummerl');

  // Player 1 wins round again (also non-Schneider), reaching 0 score again (wins 2nd Bummerl -> wins Match!)
  state.players[0]!.score = 4;
  state.players[2]!.score = 4;
  state.players[1]!.score = 0;
  engine.finalizeSchnapsenRound(state, 1, 'P2 gewinnt den letzten Stich!', 1);
  assert.strictEqual(state.phase, 'MATCH_COMPLETED');
  assert.strictEqual(state.status, 'COMPLETED');
  assert.strictEqual(state.schnapsenState!.bummerlsWon![1], 2, 'Player 1 reached 2 Bummerl');
});

test('Schnapsen Options: allowZudrehen and allowTrumpfTausch disabling', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const players = [
    { userId: 'u0', username: 'A', isBot: false },
    { userId: 'u1', username: 'B', isBot: true },
  ];

  const state = engine.createInitialState('s-opts', 'SOPTS', 1, players, undefined, true, undefined, {
    targetBummerl: 1,
    allowZudrehen: false,
    allowTrumpfTausch: false,
    schneiderBummerl: true,
  });

  // Attempting to close talon or swap trump throws when disabled
  assert.throws(() => {
    engine.handleSchnapsenAction(state, 1, { action: 'close_talon' });
  }, /Das Zudrehen ist in diesem Spiel deaktiviert/);

  assert.throws(() => {
    engine.handleSchnapsenAction(state, 1, { action: 'swap_trump' });
  }, /Der Trumpftausch mit dem Buben ist in diesem Spiel deaktiviert/);
});

test('Schnapsen Logic: declare_66 requires tricksWon > 0 (Irrtum if 0 tricks)', () => {
  const engine = new SchnapsenEngine('schnapsen_2');
  const players = [
    { userId: 'u0', username: 'A', isBot: false },
    { userId: 'u1', username: 'B', isBot: false },
  ];
  const state = engine.createInitialState('s-66', 'S66', 1, players);
  state.phase = 'TRICK_PLAY';
  state.schnapsenState!.playerEyes[0] = 66;

  // Case 1: Player 0 has 66 eyes but 0 tricks won -> Irrtum! Opponent (Player 1) wins!
  state.players[0]!.tricksWon = 0;
  const errRes = engine.handleSchnapsenAction(state, 0, { action: 'declare_66' });
  assert.strictEqual(errRes.roundEnded, true);
  assert.strictEqual(errRes.state.lastRoundResult!.declarerSeat, 1, 'Opponent wins on Irrtum when claiming 66 without a trick');

  // Case 2: Player 0 has 66 eyes and 1 trick won -> Valid claim! Player 0 wins!
  const state2 = engine.createInitialState('s-66-2', 'S662', 1, players);
  state2.phase = 'TRICK_PLAY';
  state2.schnapsenState!.playerEyes[0] = 66;
  state2.players[0]!.tricksWon = 1;
  const winRes = engine.handleSchnapsenAction(state2, 0, { action: 'declare_66' });
  assert.strictEqual(winRes.roundEnded, true);
  assert.strictEqual(winRes.state.lastRoundResult!.declarerSeat, 0, 'Player 0 wins legitimately with >= 66 eyes and >= 1 trick');
});

test('Schnapsen Logic: MITSCHREIBEN_3P active opponent resolution', () => {
  const engine = new SchnapsenEngine('schnapsen_3');
  const players = [
    { userId: 'u0', username: 'P1', isBot: false },
    { userId: 'u1', username: 'P2', isBot: true },
    { userId: 'u2', username: 'P3', isBot: true },
  ];
  const state = engine.createInitialState('s-mit-opp', 'SMIT', 1, players, undefined, true, undefined, {
    subMode3: 'MITSCHREIBEN_3P',
  });

  // Dealer (paused) is seat 0. Active players are seats 1 and 2.
  assert.strictEqual(state.schnapsenState!.pausedDealerSeat, 0);
  assert.strictEqual(engine.getActiveOpponentSeat(state, 1), 2, 'Opponent of active player 1 is active player 2');
  assert.strictEqual(engine.getActiveOpponentSeat(state, 2), 1, 'Opponent of active player 2 is active player 1');
});
