import brackets from "../utils/bracket.js";
import prisma from "../plugins/prisma.js";

export const tournamentControllers = {
  createTournament: async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).send({ error: "Missing user ID" });
    }
    try {
      const userServiceUrls = "http://user-service:3002";

      let userData = null;
      for (const baseUrl of userServiceUrls) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-management/users/${userId}`
          );
          if (response.ok) {
            userData = await response.json();
            break;
          }
        } catch (err) {
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
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
      const userServiceUrls = "http://user-service:3002";

      let userData = null;
      for (const baseUrl of userServiceUrls) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-management/users/${userId}`
          );
          if (response.ok) {
            userData = await response.json();
            break;
          }
        } catch (err) {
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
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

      await prisma.Tournament.update({
        where: { id: tournamentId },
        data: {
          playersCount: {
            increment: 1,
          },
        },
      });

      res.send({ message: "Player joined tournament successfully" });
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
      const userServiceUrls = "http://user-service:3002";

      let userData = null;
      for (const baseUrl of userServiceUrls) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-management/users/${userId}`
          );
          if (response.ok) {
            userData = await response.json();
            break;
          }
        } catch (err) {
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
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

      res.send({ message: "Player left tournament successfully" });
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
      const userServiceUrls = "http://user-service:3002";

      let userData = null;
      for (const baseUrl of userServiceUrls) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-management/users/${userId}`
          );
          if (response.ok) {
            userData = await response.json();
            break;
          }
        } catch (err) {
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
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

      res.send({ message: "Tournament started and matches generated" });
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

      res.send({
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

      const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        return acc;
      }, {});

      res.send({
        message: "Tournament matches retrieved successfully",
        tournamentId,
        totalMatches: matches.length,
        totalRounds: Object.keys(matchesByRound).length,
        matches: matches,
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
      res.send({
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

      res.send({ message: "Match result recorded successfully" });
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

      res.send({ message: "Tournament stopped successfully" });
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

      res.send({
        message:
          "Tournament reset successfully. All matches cleared and status set to pending.",
      });
    } catch (error) {
      console.error("Error resetting tournament:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  },
};
