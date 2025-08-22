import prisma from "../prisma/prisma.js";

export const gameController = {
  // rejectGameRequest: async function (request, reply) {
    

  // },
  addGameHistory: async function (request, reply) {
    const { session, gameId } = request.body;
    console.log('addGameHistory session:', session);
    console.log('addGameHistory gameId:', gameId);

    const player1 = await prisma.userProfile.findFirst({
      where: { id: parseInt(session.player1Id, 10) },
    });
    const player2 = await prisma.userProfile.findFirst({
      where: { id: parseInt(session.player2Id, 10) },
    });

    if (!player1 || !player2) {
      // return reply.code(404).send({ error: "One or both players not found." });
      console.log('error finding one of the players');
    }

    console.log('player1.userId: ', player1.id);
    console.log('player1.userId: ', player2.id);

    const player1Id = player1.id;
    const player2Id = player2.id;

    let result1 = 'draw';
    let result2 = 'draw';

    if (session.score.player1 > session.score.player2) {
      result1 = 'win';
      result2 = 'loss';
    } else if (session.score.player1 < session.score.player2) {
      result1 = 'loss';
      result2 = 'win';
    }

    const duration = Math.floor((Date.now() - session.createdAt) / 1000);
    console.log({
      userId1: 1,
      userId2: 2,
      gameId,
      result1,
      result2,
      player1Score: session.score.player1,
      player2Score: session.score.player2,
      duration,
    });

    try {
      // get current stats for both players
      const [currentStats1, currentStats2] = await Promise.all([
        prisma.gameStats.findUnique({ where: { userId: player1Id } }),
        prisma.gameStats.findUnique({ where: { userId: player2Id } })
      ]);

      let newCurrentStreak1, newBestStreak1;
      if (result1 === 'win') {
        newCurrentStreak1 = (currentStats1?.currentStreak || 0) + 1;
        newBestStreak1 = Math.max(newCurrentStreak1, currentStats1?.bestStreak || 0);
      } else {
        newCurrentStreak1 = 0;
        newBestStreak1 = currentStats1?.bestStreak || 0;
      }

      // Calculate new streak and best streak for player2
      let newCurrentStreak2, newBestStreak2;
      if (result2 === 'win') {
        newCurrentStreak2 = (currentStats2?.currentStreak || 0) + 1;
        newBestStreak2 = Math.max(newCurrentStreak2, currentStats2?.bestStreak || 0);
      } else {
        newCurrentStreak2 = 0;
        newBestStreak2 = currentStats2?.bestStreak || 0;
      }

      const results = await prisma.$transaction([
        prisma.gameHistory.create({
          data: {
            userId: player1Id,
            gameId: String(gameId),
            opponentId: player2Id,
            gameType: 'classic',
            result: result1,
            playerScore: session.score.player1,
            opponentScore: session.score.player2,
            duration: duration
          }
        }),
        prisma.gameHistory.create({
          data: {
            userId: player2Id,
            gameId: String(gameId),
            opponentId: player1Id,
            gameType: 'classic',
            result: result2,
            playerScore: session.score.player2,
            opponentScore: session.score.player1,
            duration: duration
          }
        }),
        // should update for each user if user won or lost the game
        prisma.GameStats.upsert({
          where: { userId: player1Id },
          update: {
            totalGames: { increment: 1 },
            wins: result1 === 'win' ? { increment: 1 } : undefined,
            losses: result1 === 'loss' ? { increment: 1 } : undefined,
            currentStreak: newCurrentStreak1,
            bestStreak: newBestStreak1,
          },
          create: {
            id: player1Id,
            userId: player1Id,
            totalGames: 1,
            wins: result1 === 'win' ? 1 : 0,
            losses: result1 === 'loss' ? 1 : 0,
            tournaments: 0,
            tournamentsWins: 0,
            bestStreak: newBestStreak1,
            currentStreak: newCurrentStreak1,
          }
        }),
        prisma.gameStats.upsert({
          where: { userId: player2Id },
          update: {
            totalGames: { increment: 1 },
            wins: result2 === 'win' ? { increment: 1 } : undefined,
            losses: result2 === 'loss' ? { increment: 1 } : undefined,
            bestStreak: newBestStreak2,
            currentStreak: newCurrentStreak2,
          },
          create: {
            id: player2Id,
            userId: player2Id,
            totalGames: 1,
            wins: result2 === 'win' ? 1 : 0,
            losses: result2 === 'loss' ? 1 : 0,
            tournaments: 0,
            tournamentsWins: 0,
            bestStreak: newBestStreak2,
            currentStreak: newCurrentStreak2,
          }
        })
      ]);
      console.log('Game results stored:', { results });
    } catch (error) {
      console.error('Error storing game results:', error);
      throw error;
    }




    return reply.code(200).send({ message: "Game history added successfully." });
  },
  addAchievements: async function (request, reply) {
  try {
    // const session = request.body.session; // Assuming session data is sent in the body
    const winner = request.body.winner;
    if (!winner) {
      return reply.code(400).send({ error: "Invalid session data." });
    }

    const winnerProfile = await prisma.userProfile.findFirst({
      where: { displayName: winner },
    });

    if (!winnerProfile) {
      console.log('Error: winnerProfile not found');
      return reply.code(404).send({ error: "winnerProfile not found." });
    }

    const winnerId = winnerProfile.id;

    console.log('winnerId:', winnerId);

    const stats = await prisma.gameStats.findUnique({
      where: { userId: winnerId }
    });
    // add first win achievement
    if (stats && stats.wins > 0) {
      const hasAchievement = await prisma.userProfile.findUnique({
        where: { id: winnerId },
        select: {
          achievements: {
            where: { id: 1 }
          }
        }
      });

      if (!hasAchievement.achievements.length) {
        await prisma.userProfile.update({
          where: { id: winnerId },
          data: {
            achievements: {
              connect: { id: 1 }
            }
          }
        });

        console.log('Added First Win achievement to player1');
      } else {
        console.log('Player1 already has the First Win achievement');
      }
    }

    return reply.send({ message: "Achievement check completed." });

  } catch (error) {
    console.error('Error in addAchievements:', error);
    return reply.code(500).send({ error: "Internal server error" });
  }
}

};
