import assert from 'node:assert';
import test from 'node:test';
import { Card, GameMode } from '@spielfranzen/shared';
import { BotEngine } from './BotEngine.js';
import { createDeck, shuffleDeck, sortCards } from './deck.js';
import { GameEngine } from './GameEngine.js';
import { getLegalCardIds, sanitizeGameStateForPlayer } from './sanitizer.js';

test('1. Deck Verification: 33 cards, 120 eyes, Schell Weli rank 1', () => {
  const deck = createDeck();
  assert.strictEqual(deck.length, 33, 'Deck must have exactly 33 cards');

  const totalPoints = deck.reduce((sum, c) => sum + c.points, 0);
  assert.strictEqual(totalPoints, 120, 'Deck must have exactly 120 eyes/points');

  // Check Weli
  const weli = deck.find((c) => c.id === 'SCHELL_WELI');
  assert.ok(weli, 'Weli card must exist');
  assert.strictEqual(weli.suit, 'SCHELL');
  assert.strictEqual(weli.rank, 1, 'Weli rank must be 1');
  assert.strictEqual(weli.points, 0, 'Weli points must be 0');

  // Check 8 cards per suit (plus 1 extra in Schell)
  const eichel = deck.filter((c) => c.suit === 'EICHEL');
  const laub = deck.filter((c) => c.suit === 'LAUB');
  const schell = deck.filter((c) => c.suit === 'SCHELL');
  const herz = deck.filter((c) => c.suit === 'HERZ');

  assert.strictEqual(eichel.length, 8);
  assert.strictEqual(laub.length, 8);
  assert.strictEqual(schell.length, 9); // 8 regular + Weli
  assert.strictEqual(herz.length, 8);
});

test('2. Card Sorting: Trump first, then suit, descending rank', () => {
  const deck = createDeck();
  const sorted = sortCards(deck, 'HERZ');

  // Trump cards (Herz) must come first
  const firstCard = sorted[0]!;
  assert.strictEqual(firstCard.suit, 'HERZ');
  assert.strictEqual(firstCard.rank, 9); // Herz Ass

  // Inside Schell, Weli must be last
  const schellCards = sorted.filter((c) => c.suit === 'SCHELL');
  assert.strictEqual(schellCards[schellCards.length - 1]!.id, 'SCHELL_WELI');
});

test('3. Bidding State Machine: Vorhand-Halte-Prinzip & Duell', () => {
  const players = [
    { userId: 'u1', username: 'Vorhand', isBot: false },
    { userId: 'u2', username: 'Mittelhand', isBot: false },
    { userId: 'u3', username: 'Hinterhand', isBot: false },
  ];

  const state = GameEngine.createInitialState('match-1', 'CODE12', 5, players);
  // Fix dealer to seat 2 (Hinterhand) so Vorhand is seat 0
  state.dealerSeat = 2;
  state.currentTurnSeat = 0;
  state.biddingState.currentTurnSeat = 0;

  // Seat 0 opens with 4
  GameEngine.handleBid(state, 0, 'open');
  assert.strictEqual(state.biddingState.currentBid, 4);
  assert.strictEqual(state.biddingState.holderSeat, 0);
  assert.strictEqual(state.biddingState.challengerSeat, 1);
  assert.strictEqual(state.currentTurnSeat, 1);

  // Seat 1 raises to 5
  GameEngine.handleBid(state, 1, 'raise', 5);
  assert.strictEqual(state.biddingState.currentBid, 5);
  // Turn goes to holder (Seat 0) to hold or pass
  assert.strictEqual(state.currentTurnSeat, 0);

  // Seat 0 holds 5 (holding precedence)
  GameEngine.handleBid(state, 0, 'hold');
  assert.strictEqual(state.biddingState.currentBid, 5);
  // Turn goes back to challenger (Seat 1)
  assert.strictEqual(state.currentTurnSeat, 1);

  // Seat 1 passes
  GameEngine.handleBid(state, 1, 'pass');
  // Third player (Seat 2) now enters as challenger
  assert.strictEqual(state.biddingState.challengerSeat, 2);
  assert.strictEqual(state.currentTurnSeat, 2);

  // Seat 2 passes
  GameEngine.handleBid(state, 2, 'pass');

  // Bidding concluded: Winner is Seat 0 with bid 5
  assert.strictEqual(state.phase, 'TALON_AND_DECLARATION');
  assert.strictEqual(state.declarerSeat, 0);
  assert.strictEqual(state.minMode, 5);
});

test('4. Bidding State Machine: All pass redeals without consuming round', () => {
  const players = [
    { userId: 'u1', username: 'P1', isBot: false },
    { userId: 'u2', username: 'P2', isBot: false },
    { userId: 'u3', username: 'P3', isBot: false },
  ];

  const state = GameEngine.createInitialState('match-2', 'CODE34', 5, players);
  state.dealerSeat = 0;
  GameEngine.startNewRound(state);
  const initialRound = state.currentRound;

  // Vorhand is 1, Mittelhand is 2, Hinterhand is 0
  GameEngine.handleBid(state, 1, 'pass');
  GameEngine.handleBid(state, 2, 'pass');
  GameEngine.handleBid(state, 0, 'pass');

  // Should have redealt
  assert.strictEqual(state.currentRound, initialRound, 'Round must not increment on all-pass');
  assert.strictEqual(state.dealerSeat, 1, 'Dealer must shift clockwise to 1');
  assert.strictEqual(state.phase, 'BIDDING');
});

test('5. Talon & Declaration Phase: Picking talon, discarding 3, selecting mode', () => {
  const players = [
    { userId: 'u1', username: 'P1', isBot: false },
    { userId: 'u2', username: 'P2', isBot: false },
    { userId: 'u3', username: 'P3', isBot: false },
  ];

  const state = GameEngine.createInitialState('match-3', 'CODE56', 5, players);
  state.phase = 'TALON_AND_DECLARATION';
  state.declarerSeat = 0;
  state.minMode = 5;

  assert.strictEqual(state.hands[0]!.length, 10);
  assert.strictEqual(state.talon.length, 3);

  // Declarer discards 3 cards from the 13
  const available13 = [...state.hands[0]!, ...state.talon];
  const discards = [available13[0]!.id, available13[1]!.id, available13[2]!.id];

  GameEngine.handleTalonAction(state, 0, 'take_talon', discards, 6); // Mode 6 (Laub)

  assert.strictEqual(state.hands[0]!.length, 10, 'Hand must be 10 cards after discarding');
  assert.strictEqual(state.discardedCards.length, 3);
  assert.strictEqual(state.talonTaken, true);
  assert.strictEqual(state.gameMode, 6);
  assert.strictEqual(state.phase, 'TRICK_PLAY');
  assert.strictEqual(state.currentTurnSeat, 0, 'Declarer leads first trick');
});

test('6. Trick Play Legality: Farbzwang and Trumpfzwang', () => {
  const cardEichelAss: Card = { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' };
  const cardEichel10: Card = { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10er', shortName: '10' };
  const cardHerzAss: Card = { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' };
  const cardLaubAss: Card = { id: 'LAUB_9', suit: 'LAUB', rank: 9, points: 11, name: 'Laub Ass', shortName: 'A' };

  // Case A: Player holds lead suit -> MUST follow suit
  const handWithLeadSuit = [cardEichel10, cardHerzAss, cardLaubAss];
  const trickLeadEichel = [{ seatIndex: 0, card: cardEichelAss }];
  const legal1 = getLegalCardIds(handWithLeadSuit, trickLeadEichel, 8); // Mode 8 = Herz trump
  assert.deepStrictEqual(legal1, ['EICHEL_8'], 'Must follow lead suit when holding lead suit');

  // Case B: Player void in lead suit, holds trump -> MUST play trump in color games (Mode 8)
  const handVoidInLeadWithTrump = [cardHerzAss, cardLaubAss];
  const legal2 = getLegalCardIds(handVoidInLeadWithTrump, trickLeadEichel, 8);
  assert.deepStrictEqual(legal2, ['HERZ_9'], 'Must play trump when void in lead suit in color game');

  // Case C: Player void in lead suit in Bettl (Mode 9, no trump) -> can play any card
  const legal3 = getLegalCardIds(handVoidInLeadWithTrump, trickLeadEichel, 9);
  assert.strictEqual(legal3.length, 2, 'Can play any card in no-trump game when void');
});

test('7. Trick Winner: Highest trump beats lead suit, highest lead suit wins if no trump', () => {
  const cardEichelAss: Card = { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' };
  const cardEichel10: Card = { id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10', shortName: '10' };
  const cardHerz7: Card = { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7', shortName: '7' };

  // Mode 8: Herz is trump
  // Player 0 leads Eichel Ass, Player 1 plays Eichel 10, Player 2 trumps with Herz 7
  const trick = [
    { seatIndex: 0, card: cardEichelAss },
    { seatIndex: 1, card: cardEichel10 },
    { seatIndex: 2, card: cardHerz7 },
  ];

  const winner = GameEngine.determineTrickWinner(trick, 8 as GameMode);
  assert.strictEqual(winner, 2, 'Trump card (Herz 7) must beat lead suit (Eichel Ass)');
});

test('8. Instant Win Evaluation: Reaching 66 eyes immediately terminates round', () => {
  const players = [
    { userId: 'u1', username: 'P1', isBot: false },
    { userId: 'u2', username: 'P2', isBot: false },
    { userId: 'u3', username: 'P3', isBot: false },
  ];

  const state = GameEngine.createInitialState('match-4', 'CODE78', 5, players);
  state.phase = 'TRICK_PLAY';
  state.gameMode = 5; // Eichel
  state.declarerSeat = 0;
  state.currentTurnSeat = 0;
  state.trickLeadSeat = 0;

  // Set declarer hand with Ass, other players with 7ers
  state.hands[0] = [{ id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' }];
  state.hands[1] = [{ id: 'EICHEL_8', suit: 'EICHEL', rank: 8, points: 10, name: 'Eichel 10er', shortName: '10' }];
  state.hands[2] = [{ id: 'EICHEL_7', suit: 'EICHEL', rank: 7, points: 4, name: 'Eichel König', shortName: 'K' }];

  // Declarer already had 45 points, this trick gives 11 + 10 + 4 = 25 points -> total 70 points (>= 66)
  state.declarerCardPoints = 45;

  const result1 = GameEngine.handlePlayCard(state, 0, 'EICHEL_9');
  assert.strictEqual(result1.trickCompleted, false);

  const result2 = GameEngine.handlePlayCard(state, 1, 'EICHEL_8');
  assert.strictEqual(result2.trickCompleted, false);

  const result3 = GameEngine.handlePlayCard(state, 2, 'EICHEL_7');
  assert.strictEqual(result3.trickCompleted, true);
  assert.strictEqual(result3.roundEnded, true, 'Round must end immediately when declarer reaches >= 66');
  assert.strictEqual(state.lastRoundResult?.declarerWon, true);
  assert.strictEqual(state.lastRoundResult?.declarerCardPoints, 70);

  // Zero-sum check
  const dDec = state.lastRoundResult.scoreDeltaDeclarer;
  const dDef = state.lastRoundResult.scoreDeltaDefenders;
  assert.strictEqual(dDec + 2 * dDef, 0, 'Score deltas must be exact zero-sum (100 - 50 - 50 = 0)');
});

test('9. Sanitizer: Anti-Cheat Hand Stripping', () => {
  const players = [
    { userId: 'u1', username: 'P1', isBot: false },
    { userId: 'u2', username: 'P2', isBot: false },
    { userId: 'u3', username: 'P3', isBot: false },
  ];

  const state = GameEngine.createInitialState('match-5', 'CODE99', 5, players);
  const sanitizedForP1 = sanitizeGameStateForPlayer(state, 'u1');

  // Player 1 sees their own hand (10 cards)
  assert.strictEqual(sanitizedForP1.myHand.length, 10);
  assert.strictEqual(sanitizedForP1.mySeatIndex, 0);

  // Opponents only have handCount
  assert.strictEqual(sanitizedForP1.players[1]!.handCount, 10);
  assert.strictEqual(sanitizedForP1.players[2]!.handCount, 10);

  // Hidden talon is null
  assert.strictEqual(sanitizedForP1.talonCards, null);
});
