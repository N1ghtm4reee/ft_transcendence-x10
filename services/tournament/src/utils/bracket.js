import prisma from "../plugins/prisma.js";

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateInitialMatches(players, tournamentId) {
  const shuffledPlayers = shuffle(players);

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (i + 1 < shuffledPlayers.length) {
      // Regular match with two players
      try {
        await prisma.Match.create({
          data: {
            player1Id: shuffledPlayers[i].userId,
            player2Id: shuffledPlayers[i + 1].userId,
            round: 1,
            status: "pending",
            tournamentId: tournamentId,
          },
        });
      } catch (error) {
        console.error("Error creating match:", error);
        throw new Error("Failed to create initial matches");
      }
    } else {
      // Bye match for the last player (odd number of players)
      try {
        await prisma.Match.create({
          data: {
            player1Id: shuffledPlayers[i].userId,
            player2Id: null,
            winnerId: shuffledPlayers[i].userId,
            round: 1,
            status: "completed",
            tournamentId: tournamentId,
          },
        });
      } catch (error) {
        console.error("Error creating bye match:", error);
        throw new Error("Failed to create bye match");
      }
    }
  }
}

export async function generateNextRoundMatches(tournamentId, currentRound) {
  // Get all matches from the current round
  const completedMatches = await prisma.Match.findMany({
    where: {
      tournamentId,
      round: currentRound,
      status: "completed",
    },
  });

  const winners = completedMatches.map((match) => match.winnerId);

  if (winners.length <= 1) {
    // We have a final winner!
    await prisma.Tournament.update({
      where: { id: tournamentId },
      data: {
        status: "completed",
        winnerId: winners[0],
      },
    });
    return;
  }

  // Shuffle winners before pairing
  for (let i = winners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [winners[i], winners[j]] = [winners[j], winners[i]];
  }

  const nextRoundMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      nextRoundMatches.push({
        player1Id: winners[i],
        player2Id: winners[i + 1],
        round: currentRound + 1,
        status: "pending",
      });
    } else {
      // Auto-advance this player (odd number of winners)
      nextRoundMatches.push({
        player1Id: winners[i],
        player2Id: null,
        winnerId: winners[i],
        round: currentRound + 1,
        status: "completed",
      });
    }
  }

  // Create new matches
  await Promise.all(
    nextRoundMatches.map((match) =>
      prisma.Match.create({
        data: {
          ...match,
          tournamentId,
        },
      })
    )
  );
}

const brackets = {
  generateInitialMatches,
  generateNextRoundMatches,
};

export default brackets;
