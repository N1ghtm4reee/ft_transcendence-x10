import brackets from "../utils/bracket.js";
import prisma from "../plugins/prisma.js";

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

const formatPlayerToProfileOverview = async (player) => {
  try {
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
        rank: null,
        createdAt: userData.createdAt || new Date().toISOString(),
      };
    } else {
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

const formatTournamentData = async (tournamentData) => {
  const players = [];

  if (tournamentData.players && Array.isArray(tournamentData.players)) {
    for (const player of tournamentData.players) {
      const profileOverview = await formatPlayerToProfileOverview(player);
      players.push(profileOverview);
    }
  }

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
    platerCount: players.length,
    winnerId: tournamentData.winnerId
      ? tournamentData.winnerId.toString()
      : null,
    createdBy: tournamentData.createdBy
      ? tournamentData.createdBy.toString()
      : "",
  };
};

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
        continue;
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

const broadcastTournamentToAllUsers = async (
  type,
  tournamentData,
  customData = {}
) => {
  try {
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
            playersCount: 1,
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

      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

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

      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      await notifyTournamentPlayers(
        tournamentId,
        "TOURNAMENT_JOINED",
        formattedTournamentData,
        {
          playerName: username,
          sourceId: userId,
        },
        userId
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

      await prisma.Tournament.update({
        where: { id: tournamentId },
        data: {
          playersCount: {
            decrement: 1,
          },
        },
      });

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

      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

      await notifyTournamentPlayers(
        tournamentId,
        "TOURNAMENT_LEFT",
        formattedTournamentData,
        {
          playerName: player.username,
          sourceId: userId,
        },
        userId
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

      const formattedTournamentData = await formatTournamentData(
        updatedTournament
      );

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

      const matchesWithPlayers = await Promise.all(
        matches.map(async (match) => {
          let player1 = null;
          let player2 = null;

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
          players: {
            select: {
              userId: true,
              username: true,
            },
          },
        },
      });

      const formattedTournaments = await Promise.all(
        tournaments.map(async (tournament) => {
          return await formatTournamentData(tournament);
        })
      );

      res.status(200).send({
        message: "List of tournaments retrieved successfully",
        tournaments: formattedTournaments,
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

      const formattedTournamentData = await formatTournamentData(
        tournamentWithPlayers
      );

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
      const match = await prisma.Match.findUnique({
        where: { id: matchId },
        include: { Tournament: true },
      });

      if (!match) {
        return res.status(404).send({ error: "Match not found" });
      }

      if (match.player1Id !== userId && match.player2Id !== userId) {
        return res
          .status(403)
          .send({ error: "You are not part of this match" });
      }

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

        await prisma.Match.update({
          where: { id: matchId },
          data: { status: "ongoing" },
        });

        try {
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

          if (player1 && player2 && tournamentWithPlayers) {
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

      if (tournament.createdBy !== userId) {
        return res.status(403).send({
          error: "Only tournament creator can send updates",
        });
      }

      const formattedTournamentData = await formatTournamentData(tournament);

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
