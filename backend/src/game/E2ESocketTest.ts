import assert from 'node:assert';
import { io } from 'socket.io-client';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { generateToken } from '../middleware/auth.js';

async function runE2E() {
  console.log('--- Starting Socket E2E Test ---');

  // 1. Get or create test user
  const user = await prisma.user.findFirst({ where: { username: 'Flori_King' } });
  assert.ok(user, 'User Flori_King must exist');

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  // 2. Create match in DB
  const match = await prisma.match.create({
    data: {
      code: 'TEST01',
      hostId: user.id,
      totalRounds: 5,
      status: 'WAITING',
      participants: {
        create: {
          userId: user.id,
          seatIndex: 0,
        },
      },
    },
  });

  console.log(`Created match ${match.id} (code: ${match.code})`);

  // 3. Connect Socket.IO client
  const socket = io(`http://localhost:${config.port}`, {
    auth: { token },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Socket connected successfully!');
      resolve();
    });
    socket.on('connect_error', (err) => {
      reject(err);
    });
  });

  // 4. Join match
  socket.emit('game:join_match', { matchId: match.id });

  // 5. Add 2 bots to fill seats 1 and 2
  socket.emit('game:add_bot', { matchId: match.id, seatIndex: 1 });
  socket.emit('game:add_bot', { matchId: match.id, seatIndex: 2 });

  // 6. Wait for game:state_sync with IN_PROGRESS
  const activeState = await new Promise<any>((resolve) => {
    socket.on('game:state_sync', (state: any) => {
      console.log(`Received state_sync: status=${state.status}, phase=${state.phase}`);
      if (state.status === 'IN_PROGRESS') {
        resolve(state);
      }
    });
  });

  assert.strictEqual(activeState.status, 'IN_PROGRESS');
  assert.strictEqual(activeState.phase, 'BIDDING');
  assert.strictEqual(activeState.myHand.length, 10);
  assert.strictEqual(activeState.talonCards, null); // Hidden from client

  console.log('Game started and state verified!');

  // Check DB persistence of liveGameState
  const persistedMatch = await prisma.match.findUnique({ where: { id: match.id } });
  assert.ok(persistedMatch?.liveGameState, 'liveGameState must be persisted in database!');

  socket.disconnect();
  await prisma.match.delete({ where: { id: match.id } });
  console.log('--- Socket E2E Test Passed Successfully! ---');
  process.exit(0);
}

runE2E().catch((err) => {
  console.error('Socket E2E Test Failed:', err);
  process.exit(1);
});
