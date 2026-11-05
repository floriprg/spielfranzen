import assert from 'node:assert';
import test from 'node:test';
import { DeckFactory } from './DeckFactory.js';

test('DeckFactory 1: 33-card deck (Franzen & Watten)', () => {
  const deck = DeckFactory.create33Deck();
  assert.strictEqual(deck.length, 33);
  const totalEyes = deck.reduce((sum, c) => sum + c.points, 0);
  assert.strictEqual(totalEyes, 120);

  const weli = deck.find((c) => c.id === 'SCHELL_WELI');
  assert.ok(weli);
  assert.strictEqual(weli.rank, 1);
});

test('DeckFactory 2: 20-card deck (2er-Schnapsen)', () => {
  const deck = DeckFactory.create20Deck();
  assert.strictEqual(deck.length, 20);
  const totalEyes = deck.reduce((sum, c) => sum + c.points, 0);
  assert.strictEqual(totalEyes, 120);

  // Each suit must have exactly 5 cards: 10(10), U(2), O(3), K(4), A(11)
  for (const suit of ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'] as const) {
    const suitCards = deck.filter((c) => c.suit === suit);
    assert.strictEqual(suitCards.length, 5);
    const suitPoints = suitCards.reduce((sum, c) => sum + c.points, 0);
    assert.strictEqual(suitPoints, 30);
  }
});

test('DeckFactory 3: 24-card deck (3er-Schnapsen / Bauernschnapsen)', () => {
  const deck = DeckFactory.create24Deck();
  assert.strictEqual(deck.length, 24);
  const totalEyes = deck.reduce((sum, c) => sum + c.points, 0);
  assert.strictEqual(totalEyes, 120);

  // Each suit must have exactly 6 cards: 9(0), 10(10), U(2), O(3), K(4), A(11)
  for (const suit of ['EICHEL', 'LAUB', 'SCHELL', 'HERZ'] as const) {
    const suitCards = deck.filter((c) => c.suit === suit);
    assert.strictEqual(suitCards.length, 6);
    const nines = suitCards.filter((c) => c.rank === 4);
    assert.strictEqual(nines.length, 1);
    assert.strictEqual(nines[0]!.points, 0);
  }
});

test('DeckFactory 4: createDeck dispatches by GameType', () => {
  assert.strictEqual(DeckFactory.createDeck('franzen').length, 33);
  assert.strictEqual(DeckFactory.createDeck('watten_2').length, 33);
  assert.strictEqual(DeckFactory.createDeck('watten_4').length, 33);
  assert.strictEqual(DeckFactory.createDeck('schnapsen_2').length, 20);
  assert.strictEqual(DeckFactory.createDeck('schnapsen_3').length, 20);
  assert.strictEqual(DeckFactory.createDeck('schnapsen_4').length, 20);
  assert.strictEqual(DeckFactory.create24Deck().length, 24);
});
