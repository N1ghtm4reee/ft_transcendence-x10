import prisma from "../plugins/prisma.js";

// Helper function to send tournament match notifications
async function sendTournamentMatchNotification(
  player,
  opponent,
  tournament,
  match,
  round
) {
  try {
    const notificationResponse = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: player.id,
          type: "TOURNAMENT_MATCH",
          title: "Tournament Match Ready",
          content: `Your Round ${round} match is ready! Face off against ${opponent.displayName} in ${tournament.name}`,
          sourceId: opponent.id,
          matchId: match.id,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          opponentName: opponent.displayName,
          round: round,
          metadata: {
            matchId: match.id,
            tournamentId: tournament.id,
            opponentId: opponent.id,
            round: round,
          },
        }),
      }
    );

    if (!notificationResponse.ok) {
      console.error(
        "Failed to send tournament match notification:",
        await notificationResponse.text()
      );
    } else {
      console.log(`Tournament match notification sent to player ${player.id}`);
    }
  } catch (err) {
    console.error("Error sending tournament match notification:", err);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function generateInitialMatches(players, tournamentId) {
  const shuffledPlayers = shuffle(players);

  // Get tournament details for notifications
  const tournament = await prisma.Tournament.findUnique({
    where: { id: tournamentId },
  });

  // Get user details for all players
  const userServiceUrl = "http://user-service:3002";
  const playerProfiles = {};

  for (const player of shuffledPlayers) {
    try {
      const response = await fetch(
        `${userServiceUrl}/api/user-management/users/${player.userId}`
      );
      if (response.ok) {
        const userData = await response.json();
        playerProfiles[player.userId] = userData;
      }
    } catch (err) {
      console.log(`Failed to get user data for ${player.userId}:`, err.message);
    }
  }

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (i + 1 < shuffledPlayers.length) {
      // Regular match with two players
      try {
        const match = await prisma.Match.create({
          data: {
            player1Id: shuffledPlayers[i].userId,
            player2Id: shuffledPlayers[i + 1].userId,
            round: 1,
            status: "pending",
            tournamentId: tournamentId,
          },
        });

        // Send tournament match notifications to both players
        const player1Profile = playerProfiles[shuffledPlayers[i].userId];
        const player2Profile = playerProfiles[shuffledPlayers[i + 1].userId];

        if (player1Profile && player2Profile) {
          // Notify Player 1
          await sendTournamentMatchNotification(
            player1Profile,
            player2Profile,
            tournament,
            match,
            1
          );

          // Notify Player 2
          await sendTournamentMatchNotification(
            player2Profile,
            player1Profile,
            tournament,
            match,
            1
          );
        }
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

  // Get tournament details and user profiles for notifications
  const tournament = await prisma.Tournament.findUnique({
    where: { id: tournamentId },
  });

  const userServiceUrl = "http://user-service:3002";
  const playerProfiles = {};

  for (const playerId of winners) {
    try {
      const response = await fetch(
        `${userServiceUrl}/api/user-management/users/${playerId}`
      );
      if (response.ok) {
        const userData = await response.json();
        playerProfiles[playerId] = userData;
      }
    } catch (err) {
      console.log(`Failed to get user data for ${playerId}:`, err.message);
    }
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

  // Create new matches and send notifications
  for (const matchData of nextRoundMatches) {
    const match = await prisma.Match.create({
      data: {
        ...matchData,
        tournamentId,
      },
    });

    // Send notifications for matches with two players
    if (matchData.player2Id) {
      const player1Profile = playerProfiles[matchData.player1Id];
      const player2Profile = playerProfiles[matchData.player2Id];

      if (player1Profile && player2Profile) {
        // Notify Player 1
        await sendTournamentMatchNotification(
          player1Profile,
          player2Profile,
          tournament,
          match,
          currentRound + 1
        );

        // Notify Player 2
        await sendTournamentMatchNotification(
          player2Profile,
          player1Profile,
          tournament,
          match,
          currentRound + 1
        );
      }
    }
  }
}

const brackets = {
  generateInitialMatches,
  generateNextRoundMatches,
};

export default brackets;
