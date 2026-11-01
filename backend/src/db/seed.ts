import bcrypt from 'bcrypt';
import { prisma } from './prisma.js';

async function main() {
  console.log('Seeding initial data...');

  const passwordHash = await bcrypt.hash('secret123', 10);

  const users = [
    {
      username: 'Flori_King',
      email: 'flori@spielfranzen.at',
      lifetimeScore: 1250,
      eloRating: 1420,
      matchesPlayed: 18,
      matchesWon: 11,
      soloGamesPlayed: 32,
      soloGamesWon: 24,
    },
    {
      username: 'BavarianAce',
      email: 'bavarian@spielfranzen.de',
      lifetimeScore: 650,
      eloRating: 1280,
      matchesPlayed: 14,
      matchesWon: 8,
      soloGamesPlayed: 25,
      soloGamesWon: 16,
    },
    {
      username: 'SchafkopfMeister',
      email: 'meister@spielfranzen.at',
      lifetimeScore: 300,
      eloRating: 1190,
      matchesPlayed: 12,
      matchesWon: 6,
      soloGamesPlayed: 20,
      soloGamesWon: 12,
    },
    {
      username: 'WeliProfi',
      email: 'weli@spielfranzen.at',
      lifetimeScore: -200,
      eloRating: 980,
      matchesPlayed: 10,
      matchesWon: 3,
      soloGamesPlayed: 15,
      soloGamesWon: 7,
    },
    {
      username: 'BettlKoenig',
      email: 'bettl@spielfranzen.at',
      lifetimeScore: -800,
      eloRating: 850,
      matchesPlayed: 16,
      matchesWon: 4,
      soloGamesPlayed: 22,
      soloGamesWon: 8,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: u,
      create: {
        ...u,
        passwordHash,
      },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
