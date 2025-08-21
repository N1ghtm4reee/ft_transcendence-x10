import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Define our two users
  const users = [
    { id: 1, username: 'aakhrif' },
    { id: 2, username: 'baarif' }
  ];

  // Initialize both users with empty game stats
  for (const user of users) {
    await prisma.gameStats.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: user.id,
        userId: user.id,
        totalGames: 0,
        wins: 0,
        losses: 0,
        tournaments: 0,
        tournamentsWins: 0,
        bestStreak: 0,
        currentStreak: 0,
      },
    });
  }

  // Generate 20 games between the two users
  const numberOfGames = 20;
  let aakhrifStreak = 0;
  let baarifStreak = 0;
  let aakhrifBestStreak = 0;
  let baarifBestStreak = 0;

  for (let gameIndex = 0; gameIndex < numberOfGames; gameIndex++) {
    const aakhrifId = 1;
    const baarifId = 2;
    
    // Randomly decide who wins (50/50 chance)
    const aakhrifWins = Math.random() > 0.5;
    
    // Update streaks based on game result
    if (aakhrifWins) {
      aakhrifStreak++;
      baarifStreak = 0; // Reset opponent's streak
      aakhrifBestStreak = Math.max(aakhrifBestStreak, aakhrifStreak);
    } else {
      baarifStreak++;
      aakhrifStreak = 0; // Reset opponent's streak
      baarifBestStreak = Math.max(baarifBestStreak, baarifStreak);
    }

    const aakhrifResult = aakhrifWins ? 'win' : 'loss';
    const baarifResult = aakhrifWins ? 'loss' : 'win';
    
    // Generate realistic scores and duration
    const aakhrifScore = aakhrifWins ? 10 : Math.floor(Math.random() * 9) + 1;
    const baarifScore = aakhrifWins ? Math.floor(Math.random() * 9) + 1 : 10;
    const duration = 180 + Math.floor(Math.random() * 240); // 3-7 minutes

    const gameId = `game-${aakhrifId}-${baarifId}-${Date.now()}-${gameIndex}`;

    // Update game stats and create game history in a transaction
    await prisma.$transaction([
      // Update aakhrif's stats
      prisma.gameStats.update({
        where: { userId: aakhrifId },
        data: {
          totalGames: { increment: 1 },
          wins: aakhrifWins ? { increment: 1 } : undefined,
          losses: aakhrifWins ? undefined : { increment: 1 },
          bestStreak: aakhrifBestStreak,
          currentStreak: aakhrifStreak,
        },
      }),

      // Update baarif's stats
      prisma.gameStats.update({
        where: { userId: baarifId },
        data: {
          totalGames: { increment: 1 },
          wins: aakhrifWins ? undefined : { increment: 1 },
          losses: aakhrifWins ? { increment: 1 } : undefined,
          bestStreak: baarifBestStreak,
          currentStreak: baarifStreak,
        },
      }),

      // Create aakhrif's game history
      prisma.gameHistory.create({
        data: {
          userId: aakhrifId,
          gameId,
          opponentId: baarifId,
          gameType: 'classic',
          result: aakhrifResult,
          playerScore: aakhrifScore,
          opponentScore: baarifScore,
          duration,
        },
      }),

      // Create baarif's game history
      prisma.gameHistory.create({
        data: {
          userId: baarifId,
          gameId,
          opponentId: aakhrifId,
          gameType: 'classic',
          result: baarifResult,
          playerScore: baarifScore,
          opponentScore: aakhrifScore,
          duration,
        },
      }),
    ]);

    console.log(`🎮 Game ${gameIndex + 1}: ${aakhrifWins ? 'aakhrif' : 'baarif'} wins! (${aakhrifScore}-${baarifScore})`);
    console.log(`   Streaks - aakhrif: ${aakhrifStreak}, baarif: ${baarifStreak}`);
  }

  // Add achievements based on performance
  const finalStats = await Promise.all([
    prisma.gameStats.findUnique({ where: { userId: 1 } }),
    prisma.gameStats.findUnique({ where: { userId: 2 } })
  ]);

  // Award "first win" achievement to users who have won at least one game
  for (let i = 0; i < users.length; i++) {
    const userId = users[i].id;
    const stats = finalStats[i];
    
    if (stats && stats.wins > 0) {
      // Check if user already has the achievement
      const hasAchievement = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
          achievements: { where: { id: 1 } },
        },
      });

      if (!hasAchievement?.achievements.length) {
        await prisma.userProfile.update({
          where: { id: userId },
          data: {
            achievements: { connect: { id: 1 } },
          },
        });
        console.log(`🏆 Awarded "First Win" achievement to ${users[i].username}`);
      }
    }

    // Award streak achievement for users with best streak >= 3
    if (stats && stats.bestStreak >= 3) {
      const hasStreakAchievement = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
          achievements: { where: { id: 2 } }, // Assuming achievement ID 2 is for streaks
        },
      });

      if (!hasStreakAchievement?.achievements.length) {
        await prisma.userProfile.update({
          where: { id: userId },
          data: {
            achievements: { connect: { id: 2 } },
          },
        });
        console.log(`🔥 Awarded "Win Streak" achievement to ${users[i].username}`);
      }
    }
  }

  // Print final statistics
  console.log('\n📊 Final Statistics:');
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const stats = finalStats[i];
    console.log(`${user.username}:`);
    console.log(`  Games: ${stats?.totalGames}, Wins: ${stats?.wins}, Losses: ${stats?.losses}`);
    console.log(`  Win Rate: ${stats?.totalGames ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : 0}%`);
    console.log(`  Best Streak: ${stats?.bestStreak}, Current Streak: ${stats?.currentStreak}`);
  }
}

main()
  .then(() => {
    console.log('\n✅ Seed completed successfully!');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });