import brackets from "../utils/bracket.js";
import prisma from "../plugins/prisma.js";

// Helper function to send tournament notifications
const sendTournamentNotification = async (
  userId,
  type,
  tournamentData,
  customData = {}
) => {
  try {
    const payload = {
      userId,
      type,
      title: customData.title || getTournamentNotificationTitle(type),
      content:
        customData.content ||
        getTournamentNotificationContent(type, tournamentData, customData),
      sourceId: customData.sourceId || tournamentData.createdBy?.toString(),
      tournamentId: tournamentData.id,
      tournamentName: tournamentData.name,
      tournamentData: tournamentData,
      ...customData,
    };

    console.log(
      `Sending tournament notification payload:`,
      JSON.stringify(payload, null, 2)
    );

    const notification = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!notification.ok) {
      console.error(
        "Failed to send tournament notification:",
        await notification.text()
      );
    } else {
      console.log(
        `Tournament notification sent successfully: ${type} for user ${userId}`
      );
    }
  } catch (error) {
    console.error("Error sending tournament notification:", error);
  }
};

// Helper function to get notification titles
const getTournamentNotificationTitle = (type) => {
  const titles = {
    TOURNAMENT_CREATED: "Tournament Created",
    TOURNAMENT_JOINED: "Player Joined Tournament",
    TOURNAMENT_LEFT: "Player Left Tournament",
    TOURNAMENT_STARTED: "Tournament Started",
    TOURNAMENT_CANCELLED: "Tournament Cancelled",
    TOURNAMENT_MATCH_READY: "Tournament Match Ready",
  };
  return titles[type] || "Tournament Notification";
};

// Helper function to get notification content
const getTournamentNotificationContent = (type, tournamentData, customData) => {
  switch (type) {
    case "TOURNAMENT_CREATED":
      return `New tournament "${tournamentData.name}" has been created`;
    case "TOURNAMENT_JOINED":
      return `${customData.playerName || "Someone"} joined tournament "${
        tournamentData.name
      }"`;
    case "TOURNAMENT_LEFT":
      return `${customData.playerName || "Someone"} left tournament "${
        tournamentData.name
      }"`;
    case "TOURNAMENT_STARTED":
      return `Tournament "${tournamentData.name}" has started!`;
    case "TOURNAMENT_CANCELLED":
      return `Tournament "${tournamentData.name}" has been cancelled`;
    case "TOURNAMENT_MATCH_READY":
      return `Your tournament match is ready in "${tournamentData.name}"`;
    default:
      return "Tournament update";
  }
};

// Helper function to format player data to ProfileOverview format
const formatPlayerToProfileOverview = async (player) => {
  try {
    // Fetch user profile data
    const userResponse = await fetch(
      `http://user-service:3002/api/user-management/users/${player.userId}`,
      {
        method: "GET",
      }
    );

    if (userResponse.ok) {
      const userData = await userResponse.json();
      return {
        id: userData.id.toString(),
        displayName: userData.displayName || player.username,
        avatar: userData.avatar || "assets/default.png",
        bio: userData.bio || "",
        status: "offline", 
        rank: null, // Can be enhanced with ranking system
        createdAt: userData.createdAt || new Date().toISOString(),
      };
    } else {
      // Fallback if user service is unavailable
      return {
        id: player.userId.toString(),
        displayName: player.username,
        avatar: "assets/default.png",
        bio: "",
        status: "offline",
        rank: null,
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error fetching user profile for player:", error);
    // Fallback data
    return {
      id: player.userId.toString(),
      displayName: player.username,
      avatar: "assets/default.png",
      bio: "",
      status: "offline",
      rank: null,
      createdAt: new Date().toISOString(),
    };
  }
};

// Helper function to format tournament data to match frontend interface
const formatTournamentData = async (tournamentData) => {
  const players = [];

  if (tournamentData.players && Array.isArray(tournamentData.players)) {
    for (const player of tournamentData.players) {
      const profileOverview = await formatPlayerToProfileOverview(player);
      players.push(profileOverview);
    }
  }

  // Map database status to frontend status
  const statusMapping = {
    pending: "upcoming",
    started: "ongoing",
    completed: "completed",
    cancelled: "cancelled",
  };

  return {
    id: tournamentData.id.toString(),
    name: tournamentData.name,
    status: statusMapping[tournamentData.status] || "upcoming",
    startDate: tournamentData.startTime || new Date().toISOString(),
    endDate: tournamentData.endTime || new Date().toISOString(),
    players: players,
    platerCount: players.length, // Note: keeping your typo "platerCount" as in interface
    winnerId: tournamentData.winnerId
      ? tournamentData.winnerId.toString()
      : null,
    createdBy: tournamentData.createdBy
      ? tournamentData.createdBy.toString()
      : "",
  };
};

// Helper function to notify all tournament players
const notifyTournamentPlayers = async (
  tournamentId,
  type,
  tournamentData,
  customData = {},
  excludeUserId = null
) => {
  try {
    const players = await prisma.Player.findMany({
      where: { tournamentId },
      select: { userId: true, username: true },
    });

    for (const player of players) {
      if (excludeUserId && player.userId === excludeUserId) {
        continue; // Skip the user who triggered the action
      }

      await sendTournamentNotification(player.userId, type, tournamentData, {
        ...customData,
        playerName: customData.playerName || player.username,
      });
    }
  } catch (error) {
    console.error("Error notifying tournament players:", error);
  }
};

// Helper function to broadcast tournament notifications to all users
const broadcastTournamentToAllUsers = async (
  type,
  tournamentData,
  customData = {}
) => {
  try {
    // Get all users from user service (using profiles endpoint with limit=all)
    const userResponse = await fetch(
      "http://user-service:3002/api/user-management/profiles?name=&limit=all",
      {
        method: "GET",
      }
    );

    if (!userResponse.ok) {
      console.error("Failed to fetch users for tournament broadcast");
      return;
    }

    const users = await userResponse.json();

    // Send notification to all users
    for (const user of users) {
      await sendTournamentNotification(
        user.id,
        type,
        tournamentData,
        customData
      );
    }

    console.log(`Broadcasted ${type} notification to ${users.length} users`);
  } catch (error) {
    console.error(
      "Error broadcasting tournament notification to all users:",
      error
    );
  }
};

// Example usage for TOURNAMENT_UPDATE broadcasts (can be called from other functions):
// await broadcastTournamentToAllUsers(
//   "TOURNAMENT_UPDATE",
//   tournamentData,
//   { message: "Custom update message" }
// );

export const tournamentControllers = {
  createTournament: async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }
    try {
      const userServiceUrl = "http://user-service:3002";

      let userData = null;
      try {
        const response = await fetch(
          `${userServiceUrl}/api/user-management/users/${userId}`
        );
        if (response.ok) {
          userData = await response.json();
        }
      } catch (err) {
        console.log(`Failed to connect to ${userServiceUrl}:`, err.message);
      }

      if (!userData || !userData.id) {
        return res.status(404).send({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
    const { name, status, startTime, username } = req.body;

    if (!name || !status || !startTime || !username) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    console.log("Creating tournament with data:", {
      name,
      status,
      startTime,
      userId,
      username,
    });

    try {
      const result = await prisma.$transaction(async (prisma) => {
        const tournament = await prisma.Tournament.create({
          data: {
            name,
            status,
            startTime,
            createdBy: userId,
          },
        });

        const player = await prisma.Player.create({
          data: {
            userId,
            username,
            tournamentId: tournament.id,
          },
        });

        return { tournament, player };
      });

      // Fetch complete tournament data with players for notification
      const tournamentWithPlayers = await prisma.Tournament.findUnique({
        where: { id: result.tournament.id },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      // Broadcast tournament creation notification to all users
      await broadcastTournamentToAllUsers(
        "TOURNAMENT_CREATED",
        formattedTournamentData,
        {
          sourceId: userId,
          creatorName: username,
        }
      );

      res.status(201).send({
        message: "Tournament created successfully and creator added as player",
        tournament: result.tournament,
        player: result.player,
      });
    } catch (error) {
      console.error("Error creating tournament:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  joinTournament: async (req, res) => {
    const userId = req.headers["x-user-id"];

    try {
      const userServiceUrl = "http://user-service:3002";

      let userData = null;
      try {
        const response = await fetch(
          `${userServiceUrl}/api/user-management/users/${userId}`
        );
        if (response.ok) {
          userData = await response.json();
        }
      } catch (err) {
        console.log(`Failed to connect to ${userServiceUrl}:`, err.message);
      }

      if (!userData || !userData.id) {
        return res.status(404).send({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }
    const { username, tournamentId } = req.body;

    if (!username || !tournamentId) {
      return res.status(400).send({ error: "Missing fields" });
    }

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      // check if tournament full or not
      if (tournament.playersCount >= 4) {
        return res.status(400).send({
          error: "tournament is full !",
        });
      }
      if (
        tournament.status === "started" ||
        tournament.status === "completed" ||
        tournament.status === "cancelled"
      ) {
        return res.status(400).send({
          error: "Cannot join tournament that has already started or completed",
        });
      }

      // check if userID exists or not

      const existingPlayer = await prisma.Player.findFirst({
        where: { userId, tournamentId },
      });

      if (existingPlayer) {
        return res.status(400).send({ error: "Player already joined" });
      }

      await prisma.Player.create({
        data: {
          userId,
          username,
          tournamentId,
        },
      });

      const updatedTournament = await prisma.Tournament.update({
        where: { id: tournamentId },
        data: {
          playersCount: {
            increment: 1,
          },
        },
      });

      // Fetch complete tournament data with players for notification
      const tournamentWithPlayers = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      // Send notification to all existing tournament players about new player joining
      await notifyTournamentPlayers(
        tournamentId,
        "TOURNAMENT_JOINED",
        formattedTournamentData,
        {
          playerName: username,
          sourceId: userId,
        },
        userId // Exclude the player who just joined from receiving their own notification
      );

      res
        .status(200)
        .send({ message: "Player joined tournament successfully" });
    } catch (error) {
      console.error("Error joining tournament:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  leaveTournament: async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }
    try {
      const userServiceUrl = "http://user-service:3002";

      let userData = null;
      try {
        const response = await fetch(
          `${userServiceUrl}/api/user-management/users/${userId}`
        );
        if (response.ok) {
          userData = await response.json();
        }
      } catch (err) {
        console.log(`Failed to connect to ${userServiceUrl}:`, err.message);
      }

      if (!userData || !userData.id) {
        return res.status(404).send({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
    const { tournamentId } = req.body;

    if (!tournamentId) {
      return res.status(400).send({ error: "Missing tournament ID" });
    }

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      if (
        tournament.status === "started" ||
        tournament.status === "completed" ||
        tournament.status === "cancelled"
      ) {
        return res.status(400).send({
          error:
            "Cannot leave tournament that has already started or completed or cancelled",
        });
      }

      const player = await prisma.Player.findFirst({
        where: { userId, tournamentId },
      });

      if (!player) {
        return res
          .status(404)
          .send({ error: "Player not found in this tournament" });
      }

      await prisma.Player.delete({
        where: { id: player.id },
      });

      // Fetch complete tournament data with remaining players for notification
      const tournamentWithPlayers = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      // Send notification to all remaining tournament players about player leaving
      await notifyTournamentPlayers(
        tournamentId,
        "TOURNAMENT_LEFT",
        formattedTournamentData,
        {
          playerName: player.username,
          sourceId: userId,
        },
        userId // Exclude the player who left from receiving notification
      );

      res.status(200).send({ message: "Player left tournament successfully" });
    } catch (error) {
      console.error("Error leaving tournament:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  startTournament: async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }
    try {
      const userServiceUrl = "http://user-service:3002";

      let userData = null;
      try {
        const response = await fetch(
          `${userServiceUrl}/api/user-management/users/${userId}`
        );
        if (response.ok) {
          userData = await response.json();
        }
      } catch (err) {
        console.log(`Failed to connect to ${userServiceUrl}:`, err.message);
      }

      if (!userData || !userData.id) {
        return res.status(404).send({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
    const { id: tournamentId } = req.params;

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: true,
          matches: true,
        },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      if (tournament.createdBy !== userId) {
        return res
          .status(403)
          .send({ error: "Only tournament creator can start it" });
      }
      if (
        tournament.status === "started" ||
        tournament.status === "completed" ||
        tournament.status === "cancelled"
      ) {
        return res
          .status(400)
          .send({ error: "Tournament already started or completed" });
      }

      if (tournament.matches && tournament.matches.length > 0) {
        return res.status(400).send({
          error:
            "Tournament matches already exist. Tournament may have been started before.",
        });
      }

      if (tournament.players.length === 0 || tournament.players.length < 4) {
        return res
          .status(400)
          .send({ error: "Cannot start tournament with no enough players" });
      }

      await brackets.generateInitialMatches(tournament.players, tournamentId);

      await prisma.Tournament.update({
        where: { id: tournamentId },
        data: { status: "started" },
      });

      // Fetch updated tournament data with players for notification
      const updatedTournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
          matches: true,
        },
      });

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(
        updatedTournament
      );

      // Send notification to all tournament players that tournament has started
      await notifyTournamentPlayers(
        tournamentId,
        "TOURNAMENT_STARTED",
        formattedTournamentData,
        {
          sourceId: userId,
        }
      );

      res
        .status(200)
        .send({ message: "Tournament started and matches generated" });
    } catch (error) {
      console.error("Error starting tournament:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },

  getTournament: async (req, res) => {
    const { id } = req.params;

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      res.status(200).send({
        message: "Tournament status retrieved successfully",
        tournament,
      });
    } catch (error) {
      console.error("Error retrieving tournament status:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  getTournamentMatches: async (req, res) => {
    const { id: tournamentId } = req.params;

    try {
      const userServiceUrl = "http://user-service:3002";

      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      const matches = await prisma.Match.findMany({
        where: { tournamentId },
        orderBy: [{ round: "asc" }],
      });

      // Fetch player details for each match
      const matchesWithPlayers = await Promise.all(
        matches.map(async (match) => {
          let player1 = null;
          let player2 = null;

          // Fetch player1 details if exists
          if (match.player1Id) {
            try {
              const response = await fetch(
                `${userServiceUrl}/api/user-management/users/${match.player1Id}`
              );
              if (response.ok) {
                player1 = await response.json();
              }
            } catch (error) {
              console.error(
                `Failed to fetch player1 ${match.player1Id}:`,
                error
              );
            }
          }

          // Fetch player2 details if exists
          if (match.player2Id) {
            try {
              const response = await fetch(
                `${userServiceUrl}/api/user-management/users/${match.player2Id}`
              );
              if (response.ok) {
                player2 = await response.json();
              }
            } catch (error) {
              console.error(
                `Failed to fetch player2 ${match.player2Id}:`,
                error
              );
            }
          }

          return {
            ...match,
            player1,
            player2,
            player1Score: match.score ? JSON.parse(match.score).player1 : null,
            player2Score: match.score ? JSON.parse(match.score).player2 : null,
          };
        })
      );

      const matchesByRound = matchesWithPlayers.reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        return acc;
      }, {});

      res.status(200).send({
        message: "Tournament matches retrieved successfully",
        tournamentId,
        totalMatches: matchesWithPlayers.length,
        totalRounds: Object.keys(matchesByRound).length,
        matches: matchesWithPlayers,
        matchesByRound: matchesByRound,
      });
    } catch (error) {
      console.error("Error retrieving tournament matches:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  listTournaments: async (req, res) => {
    try {
      const tournaments = await prisma.Tournament.findMany({
        include: {
          players: true,
        },
      });
      res.status(200).send({
        message: "List of tournaments retrieved successfully",
        tournaments,
      });
    } catch (error) {
      console.error("Error retrieving tournaments:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },

  reportMatchResult: async (req, res) => {
    const { matchId } = req.params;
    const { winnerId, score } = req.body;

    if (!winnerId || !score) {
      return res.status(400).send({ error: "Missing winnerId or score" });
    }

    try {
      const match = await prisma.Match.findUnique({ where: { id: matchId } });

      if (!match) {
        return res.status(404).send({ error: "Match not found" });
      }

      if (match.status === "completed") {
        return res.status(400).send({ error: "Match already completed" });
      }

      await prisma.Match.update({
        where: { id: matchId },
        data: {
          winnerId,
          score,
          status: "completed",
        },
      });

      const allMatchesInRound = await prisma.Match.findMany({
        where: {
          tournamentId: match.tournamentId,
          round: match.round,
        },
      });

      const allCompleted = allMatchesInRound.every(
        (m) => m.status === "completed"
      );

      if (allCompleted) {
        await brackets.generateNextRoundMatches(
          match.tournamentId,
          match.round
        );
      }

      res.status(200).send({ message: "Match result recorded successfully" });
    } catch (error) {
      console.error("Error reporting match result:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },

  stopTournament: async (req, res) => {
    const { id: tournamentId } = req.params;

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      if (
        tournament.status === "completed" ||
        tournament.status === "cancelled"
      ) {
        return res
          .status(400)
          .send({ error: "Tournament already completed or cancelled" });
      }

      await prisma.Tournament.update({
        where: { id: tournamentId },
        data: { status: "cancelled" },
      });

      // Fetch complete tournament data with players for notification
      const tournamentWithPlayers = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      // Broadcast tournament cancellation notification to all users
      await broadcastTournamentToAllUsers(
        "TOURNAMENT_CANCELLED",
        formattedTournamentData,
        {
          sourceId: tournament.createdBy?.toString(),
        }
      );

      res.status(200).send({ message: "Tournament stopped successfully" });
    } catch (error) {
      console.error("Error stopping tournament:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },

  resetTournament: async (req, res) => {
    const { id: tournamentId } = req.params;

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      await prisma.Match.deleteMany({
        where: { tournamentId },
      });

      await prisma.Tournament.update({
        where: { id: tournamentId },
        data: {
          status: "pending",
          winnerId: null,
        },
      });

      res.status(200).send({
        message:
          "Tournament reset successfully. All matches cleared and status set to pending.",
      });
    } catch (error) {
      console.error("Error resetting tournament:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },

  startTournamentMatch: async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }

    const { matchId } = req.params;
    const { opponentId } = req.body;

    try {
      // Get the match details
      const match = await prisma.Match.findUnique({
        where: { id: matchId },
        include: { Tournament: true },
      });

      if (!match) {
        return res.status(404).send({ error: "Match not found" });
      }

      // Verify that the requesting user is part of this match
      if (match.player1Id !== userId && match.player2Id !== userId) {
        return res
          .status(403)
          .send({ error: "You are not part of this match" });
      }

      // Verify that the opponent is the other player in the match
      const expectedOpponent =
        match.player1Id === userId ? match.player2Id : match.player1Id;
      if (expectedOpponent !== opponentId) {
        return res
          .status(400)
          .send({ error: "Invalid opponent for this match" });
      }

      if (match.status !== "pending") {
        return res
          .status(400)
          .send({ error: "Match is not in pending status" });
      }

      // Create a game challenge with tournament mode
      try {
        const gameResponse = await fetch(
          "http://game-service:3006/api/game/challenge",
          {
            method: "POST",
            headers: {
              "x-user-id": userId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              opponentId: opponentId,
              mode: "tournament",
              matchId: matchId,
            }),
          }
        );

        if (!gameResponse.ok) {
          const errorText = await gameResponse.text();
          throw new Error(`Failed to create game: ${errorText}`);
        }

        const gameResult = await gameResponse.json();

        // Update match status to indicate game has started
        await prisma.Match.update({
          where: { id: matchId },
          data: { status: "ongoing" },
        });

        // Send notification to both players that their tournament match is ready
        try {
          // Get player details and complete tournament data
          const player1 = await prisma.Player.findFirst({
            where: {
              userId: match.player1Id,
              tournamentId: match.tournamentId,
            },
          });
          const player2 = await prisma.Player.findFirst({
            where: {
              userId: match.player2Id,
              tournamentId: match.tournamentId,
            },
          });

          // Get complete tournament data with all players
          const tournamentWithPlayers = await prisma.Tournament.findUnique({
            where: { id: match.tournamentId },
            include: {
              players: {
                select: {
                  userId: true,
                  username: true,
                },
              },
            },
          });

          // Notify both players
          if (player1 && player2 && tournamentWithPlayers) {
            // Format tournament data to match frontend interface
            const formattedTournamentData = await formatTournamentData(
              tournamentWithPlayers
            );

            await sendTournamentNotification(
              match.player1Id,
              "TOURNAMENT_MATCH_READY",
              formattedTournamentData,
              {
                opponentName: player2.username,
                sourceId: match.player2Id.toString(),
                matchId: matchId,
              }
            );

            await sendTournamentNotification(
              match.player2Id,
              "TOURNAMENT_MATCH_READY",
              formattedTournamentData,
              {
                opponentName: player1.username,
                sourceId: match.player1Id.toString(),
                matchId: matchId,
              }
            );
          }
        } catch (notificationError) {
          console.error(
            "Error sending tournament match notifications:",
            notificationError
          );
          // Don't fail the match creation if notifications fail
        }

        res.status(200).send({
          message: "Tournament match game created successfully",
          gameId: gameResult.gameId,
          match: match,
        });
      } catch (error) {
        console.error("Error creating tournament game:", error);
        res.status(500).send({ error: "Failed to create tournament game" });
      }
    } catch (error) {
      console.error("Error starting tournament match:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },

  sendTournamentUpdate: async (req, res) => {
    const { id: tournamentId } = req.params;
    const { message, title } = req.body;
    const userId = req.headers["x-user-id"];

    if (!message) {
      return res.status(400).send({ error: "Message is required" });
    }

    try {
      const tournament = await prisma.Tournament.findUnique({
        where: { id: tournamentId },
        include: {
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      if (!tournament) {
        return res.status(404).send({ error: "Tournament not found" });
      }

      // Only tournament creator can send updates
      if (tournament.createdBy !== userId) {
        return res.status(403).send({
          error: "Only tournament creator can send updates",
        });
      }

      // Format tournament data to match frontend interface
      const formattedTournamentData = await formatTournamentData(tournament);

      // Broadcast tournament update to all users
      await broadcastTournamentToAllUsers(
        "TOURNAMENT_UPDATE",
        formattedTournamentData,
        {
          message,
          title: title || "Tournament Update",
          sourceId: userId,
        }
      );

      res.status(200).send({
        message: "Tournament update sent successfully",
      });
    } catch (error) {
      console.error("Error sending tournament update:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },
};
