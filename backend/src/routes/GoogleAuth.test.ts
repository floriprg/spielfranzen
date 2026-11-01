import assert from 'node:assert';
import test from 'node:test';
import { prisma } from '../db/prisma.js';

test('Google Auth 1: Successful registration & login via Google', async () => {
  const testEmail = `google_test_${Date.now()}@example.com`;
  const testGoogleId = `gid_${Date.now()}`;
  const testName = 'Max Mustermann';
  const testPicture = 'https://example.com/avatar.jpg';

  // Cleanup before test if exists
  await prisma.user.deleteMany({
    where: { OR: [{ email: testEmail }, { googleId: testGoogleId }] },
  });

  // Call the endpoint logic directly or via fetch to localhost:3002
  const res = await fetch('http://localhost:3002/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockGoogleUser: {
        email: testEmail,
        googleId: testGoogleId,
        name: testName,
        picture: testPicture,
      },
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;

  assert.ok(data.token, 'Should return a JWT token');
  assert.strictEqual(data.user.email, testEmail);
  assert.strictEqual(data.user.avatarUrl, testPicture);
  assert.ok(data.user.username.startsWith('Max_Mustermann'));

  // Verify in database
  const userInDb = await prisma.user.findUnique({
    where: { googleId: testGoogleId },
  });
  assert.ok(userInDb, 'User must exist in DB with googleId');
  assert.strictEqual(userInDb.passwordHash, null);

  // Clean up
  await prisma.user.delete({ where: { id: userInDb.id } });
});

test('Google Auth 2: Linking Google account to existing email user', async () => {
  const email = `existing_email_${Date.now()}@example.com`;
  const username = `Exist_${Math.floor(Math.random() * 10000)}`;

  // Create standard user with email & password
  const existingUser = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: 'dummy_hash',
    },
  });

  const testGoogleId = `gid_link_${Date.now()}`;
  const res = await fetch('http://localhost:3002/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockGoogleUser: {
        email,
        googleId: testGoogleId,
        name: 'Existing Google Name',
        picture: 'https://example.com/google_photo.png',
      },
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;
  assert.strictEqual(data.user.id, existingUser.id);
  assert.strictEqual(data.user.username, username);

  // Check DB that googleId is linked
  const updatedUser = await prisma.user.findUnique({
    where: { id: existingUser.id },
  });
  assert.strictEqual(updatedUser?.googleId, testGoogleId);
  assert.strictEqual(updatedUser?.avatarUrl, 'https://example.com/google_photo.png');

  // Clean up
  await prisma.user.delete({ where: { id: existingUser.id } });
});

test('Google Auth 3: Rejecting password login on account with no passwordHash', async () => {
  const email = `google_only_${Date.now()}@example.com`;
  const username = `GOnly_${Math.floor(Math.random() * 10000)}`;

  // Create Google-only user (no password)
  const googleUser = await prisma.user.create({
    data: {
      username,
      email,
      googleId: `gid_${Date.now()}`,
      passwordHash: null,
    },
  });

  const res = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrUsername: username,
      password: 'somepassword',
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = (await res.json()) as any;
  assert.ok(data.error.includes('Google'), 'Error should mention Google login');

  // Clean up
  await prisma.user.delete({ where: { id: googleUser.id } });
});
