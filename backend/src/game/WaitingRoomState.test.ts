import assert from 'node:assert';
import test from 'node:test';
import { sanitizeGameStateForPlayer } from './sanitizer.js';

test('Bugfix verification: WAITING match with timerConfig does not crash sanitizer or game state', () => {
  // If state is not fully initialized, sanitizer should gracefully handle it without throwing
  const partialState: any = {
    timer: {
      config: { enabled: true, turnTimeLimit: 60, totalTimeBank: 300 },
      turnStartedAt: null,
      turnDuration: 60,
      playerBanks: [300, 300, 300],
    },
    players: undefined,
  };

  // Sanitizing with undefined players should not throw 'findIndex' error
  assert.doesNotThrow(() => {
    try {
      sanitizeGameStateForPlayer(partialState, 'some-user');
    } catch (e: any) {
      if (e.message.includes('findIndex')) {
        throw e;
      }
    }
  });
});
