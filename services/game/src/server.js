import Fastify from "fastify";
import websocket from "@fastify/websocket";
import url from "url";
import gameRoutes from "./routes/game.routes.js";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import fastifyMetrics from "fastify-metrics";
import fastifyCors from "@fastify/cors";

const prisma = new PrismaClient();

const fastify = Fastify();
await fastify.register(websocket);

fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
});

await fastify.register(fastifyMetrics, {
  endpoint: "/metrics",
  defaultMetrics: true,
});

const sessions = new Map();
const gameLoops = new Map();
const disconnected = new Map();
const playerConnections = new Map();

const GAME_WIDTH = 20;
const GAME_HEIGHT = 10;
const BALL_SPEED = 0.15;
const PADDLE_HEIGHT = 2;
const PADDLE_SPEED = 0.5;
const RECONNECT_TIMEOUT = 30000;
const GAME_PAUSE_TIMEOUT = 30000;

function createGameSession(
  playerId1,
  playerId2,
  mode = "classic",
  matchId = null
) {
  const gameId = randomUUID();
  const session = {
    gameId,
    playerId1,
    playerId2,
    mode,
    matchId,
    player1Sock: null,
    player2Sock: null,
    gameBoard: {
      player1: {
        paddleY: GAME_HEIGHT / 2,
      },
      player2: {
        paddleY: GAME_HEIGHT / 2,
      },
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        vy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      },
    },
    score: {
      player1: 0,
      player2: 0,
    },
    gameStarted: false,
    waitingForPlayers: true,
    createdAt: Date.now(),
    isPaused: false,
    pauseReason: null,
    lastUpdateTime: Date.now(),
    invitationTimeout: null,
  };

  sessions.set(gameId, session);
  console.log(
    `Created game ${gameId} for players ${playerId1} vs ${playerId2} (${mode} mode)`
  );
  return gameId;
}

fastify.post("/api/game/accepted/:gameId", async (request, reply) => {
  try {
    const userId = request.headers["x-user-id"];
    const gameId = request.params.gameId;
    console.log("acceptGameRequest gameId:", gameId);
    const session = sessions.get(gameId);
    if (!session) {
      console.log("Session not found for gameId:", gameId);
      return reply.code(404).send({ error: "Session not found." });
    }
    const player1Id = session.playerId1;

    const notifResponse = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: player1Id,
          type: "GAME_ACCEPTED",
          title: "Game Invitation Accepted",
          content: `User ${session.playerId2} has accepted your game invitation now redirecting to game...`,
          sourceId: session.playerId2,
          requestId: gameId,
        }),
      }
    );
    if (!notifResponse.ok) {
      console.error(
        "Failed to send game accepted notification:",
        await notifResponse.text()
      );
    } else {
      console.log("Game accepted notification sent successfully");
    }
    const notifResponse2 = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.playerId2,
          type: "GAME_ACCEPTED",
          title: "Game Invitation Accepted",
          content: `redirecting to game...`,
          sourceId: session.playerId1,
          requestId: gameId,
        }),
      }
    );
    if (!notifResponse2.ok) {
      console.error(
        "Failed to send game accepted notification:",
        await notifResponse.text()
      );
    } else {
      console.log("Game accepted notification sent successfully");
    }
    if (session.invitationTimeout) {
      clearTimeout(session.invitationTimeout);
      session.invitationTimeout = null;
      console.log(`Cleared invitation timeout for game ${gameId}`);
    }
  } catch (error) {
    console.error("Error in accept game endpoint:", error);
  }
  return reply.status(500).send({
    error: "Failed to accept game invitation",
    details: error.message,
  });
});

function clearGameId(gameId) {
  console.log(`Cleaning up expired game invitation: ${gameId}`);
  const session = sessions.get(gameId);
  if (session) {
    stopGameLoop(gameId);

    if (session.player1Sock) {
      sendToPlayer(
        session.player1Sock,
        JSON.stringify({
          type: "gameExpired",
          gameId: gameId,
          message: "Game invitation has expired",
        })
      );
      session.player1Sock.gameId = null;
    }

    if (session.player2Sock) {
      sendToPlayer(
        session.player2Sock,
        JSON.stringify({
          type: "gameExpired",
          gameId: gameId,
          message: "Game invitation has expired",
        })
      );
      session.player2Sock.gameId = null;
    }

    sessions.delete(gameId);
    disconnected.delete(gameId);
  }
}

const getBlockedStatus = async (userId1, userId2) => {
  return await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: Number(userId1), blockedId: Number(userId2) },
        { blockerId: Number(userId2), blockedId: Number(userId1) },
      ],
    },
    select: { id: true, blockerId: true, blockedId: true },
  });
};

const blocker = async (userId1, userId2) => {
  const block = await prisma.blockedUser.findFirst({
    where: {
      blockerId: Number(userId1),
      blockedId: Number(userId2),
    },
    select: { id: true, blockerId: true, blockedId: true },
  });
  console.log(`blocker response : ${block}`);
  return block;
};

const blocked = async (userId1, userId2) => {
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      blockerId: Number(userId2),
      blockedId: Number(userId1),
    },
    select: { id: true, blockerId: true, blockedId: true },
  });
  console.log(`blocked response : ${blocked}`);
  return blocked;
};

fastify.post("/api/game/challenge", async (request, reply) => {
  try {
    const playerId1 = request.headers["x-user-id"];
    const playerId2 = request.query.opponentId;
    const mode = request.query.mode || "classic";
    const matchId = request.query.matchId || null;

    const [player1Profile, player2Profile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: parseInt(playerId1, 10) } }),
      prisma.userProfile.findUnique({ where: { id: parseInt(playerId2, 10) } }),
    ]);
    if (playerId1 === playerId2) {
      return reply.status(400).send({ error: "You cannot challenge yourself" });
    }
    if (!player1Profile || !player2Profile) {
      return reply.status(404).send({ error: "One or both players not found" });
    }
    if (!playerId1 || !playerId2) {
      return reply.status(400).send({
        error: "Both playerId1 and playerId2 are required",
      });
    }

    const isBlocker = await blocker(playerId1, playerId2);
    const isBlocked = await blocked(playerId1, playerId2);

    if (isBlocker || isBlocked) {
      return reply.status(400).send({
        error: "Both playerId1 and playerId2 are required",
      });
    }

    for (const [existingGameId, existingSession] of sessions.entries()) {
      if (
        existingSession.playerId1 === playerId1 ||
        existingSession.playerId1 === playerId2 ||
        existingSession.playerId2 === playerId1 ||
        existingSession.playerId2 === playerId2
      ) {
        return reply.status(409).send({
          error: "One or both players are already in an active game",
          existingGameId: existingGameId,
          details: {
            playerId1InGame:
              existingSession.playerId1 === playerId1 ||
              existingSession.playerId2 === playerId1,
            playerId2InGame:
              existingSession.playerId1 === playerId2 ||
              existingSession.playerId2 === playerId2,
          },
        });
      }
    }

    const validModes = ["classic", "tournament"];
    const gameMode = validModes.includes(mode) ? mode : "classic";

    const gameId = createGameSession(playerId1, playerId2, gameMode, matchId);

    const player1Connection = playerConnections.get(playerId1);
    const player2Connection = playerConnections.get(playerId2);

    const session = sessions.get(gameId);

    if (
      player1Connection &&
      player1Connection.readyState === 1 &&
      !player1Connection.gameId
    ) {
      session.player1Sock = player1Connection;
      player1Connection.gameId = gameId;
      console.log(
        `Player ${playerId1} already connected via websocket - assigned to game ${gameId}`
      );
    }

    if (
      player2Connection &&
      player2Connection.readyState === 1 &&
      !player2Connection.gameId
    ) {
      session.player2Sock = player2Connection;
      player2Connection.gameId = gameId;
      console.log(
        `Player ${playerId2} already connected via websocket - assigned to game ${gameId}`
      );
    }

    try {
      const timeoutID = setTimeout(() => {
        clearGameId(gameId);
      }, 5000);

      session.invitationTimeout = timeoutID;

      const notificationResponse = await fetch(
        "http://notification-service:3005/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: player2Profile.id,
            type: "GAME_INVITE",
            title: "New Game Invite",
            content: `User ${player1Profile.displayName} has invited you to a game`,
            sourceId: player1Profile.id,
            requestId: gameId,
          }),
        }
      );
      if (!notificationResponse.ok) {
        console.error(
          "Failed to send game invite notification:",
          await notificationResponse.text()
        );
      } else {
        console.log("Game invite notification sent successfully");
      }
    } catch (err) {
      console.error("Error sending game invite notification:", err);
    }
    if (session.player1Sock) {
      sendToPlayer(
        session.player1Sock,
        JSON.stringify({
          type: "gameCreated",
          gameId: gameId,
          playerNumber: 1,
          opponent: playerId2,
          mode: gameMode,
          gameBoard: session.gameBoard,
          score: session.score,
          waitingForOpponent: !session.player2Sock,
        })
      );
    }

    if (session.player2Sock) {
      sendToPlayer(
        session.player2Sock,
        JSON.stringify({
          type: "gameCreated",
          gameId: gameId,
          playerNumber: 2,
          opponent: playerId1,
          mode: gameMode,
          gameBoard: session.gameBoard,
          score: session.score,
          waitingForOpponent: !session.player1Sock,
        })
      );
    }

    if (session.player1Sock && session.player2Sock) {
      session.gameStarted = true;
      session.waitingForPlayers = false;
      startGameLoop(gameId);
      broadcastGameState(gameId);
      console.log(
        `Game ${gameId} started immediately - both players connected`
      );
    }

    return reply.send({
      success: true,
      gameId: gameId,
      message: "Game created successfully",
      playersConnected: {
        player1: !!session.player1Sock,
        player2: !!session.player2Sock,
      },
    });
  } catch (error) {
    console.error("Error creating game:", error);
    return reply.status(500).send({
      error: "Failed to create game",
      details: error.message,
    });
  }
});

function startGameLoop(gameId) {
  if (gameLoops.has(gameId)) return;

  console.log(`Starting game loop for game ${gameId}`);

  const session = sessions.get(gameId);
  if (!session) return;

  gameLoops.set(
    gameId,
    setInterval(() => {
      const currentSession = sessions.get(gameId);
      if (!currentSession || !currentSession.gameStarted) {
        return;
      }

      const p1Connected =
        currentSession.player1Sock &&
        currentSession.player1Sock.readyState === 1;
      const p2Connected =
        currentSession.player2Sock &&
        currentSession.player2Sock.readyState === 1;

      if (currentSession.isPaused) {
        return;
      }

      if (!p1Connected || !p2Connected) {
        console.log(
          `Game ${gameId} pausing - p1Connected: ${p1Connected}, p2Connected: ${p2Connected}`
        );
        console.log(
          `   Player1 socket: ${!!currentSession.player1Sock}, readyState: ${
            currentSession.player1Sock?.readyState
          }`
        );
        console.log(
          `   Player2 socket: ${!!currentSession.player2Sock}, readyState: ${
            currentSession.player2Sock?.readyState
          }`
        );
        pauseGame(gameId, "disconnection");
        return;
      }

      updateBall(currentSession, gameId);
      broadcastGameState(gameId);
    }, 1000 / 60)
  );
}
function pauseGameWin(gameId) {
  const session = sessions.get(gameId);
  if (session) {
    session.gameStarted = false;
    session.isPaused = true;
    session.pauseReason = "win";
    console.log(`Game ${gameId} paused due to player win`);
  }
}

function pauseGame(gameId, reason = "unknown") {
  const session = sessions.get(gameId);
  if (session) {
    session.gameStarted = false;
    session.isPaused = true;
    session.pauseReason = reason;
    console.log(`Game ${gameId} paused due to ${reason}`);

    const message = JSON.stringify({
      type: "gamePaused",
      reason: reason,
      message:
        reason === "disconnection"
          ? "Game paused - waiting for player to reconnect..."
          : "Game paused",
    });

    if (session.player1Sock && session.player1Sock.readyState === 1) {
      sendToPlayer(session.player1Sock, message);
    }
    if (session.player2Sock && session.player2Sock.readyState === 1) {
      sendToPlayer(session.player2Sock, message);
    }
  }
}

function resumeGame(gameId) {
  const session = sessions.get(gameId);
  if (session && session.isPaused) {
    const p1Connected =
      session.player1Sock && session.player1Sock.readyState === 1;
    const p2Connected =
      session.player2Sock && session.player2Sock.readyState === 1;

    if (p1Connected && p2Connected) {
      session.gameStarted = true;
      session.isPaused = false;
      session.pauseReason = null;
      console.log(` Game ${gameId} resumed`);

      const message = JSON.stringify({
        type: "gameResumed",
        message: "Game resumed!",
        gameBoard: session.gameBoard,
        score: session.score,
      });

      sendToPlayer(session.player1Sock, message);
      sendToPlayer(session.player2Sock, message);

      if (!gameLoops.has(gameId)) {
        startGameLoop(gameId);
      }

      return true;
    }
  }
  return false;
}

function stopGameLoop(gameId) {
  if (gameLoops.has(gameId)) {
    clearInterval(gameLoops.get(gameId));
    gameLoops.delete(gameId);
    console.log(`Game loop stopped for game ${gameId}`);
  }
}

async function handleGameCompletion(gameId, session, winner) {
  try {
    const cleanSession = {
      player1Id: session.playerId1,
      player2Id: session.playerId2,
      score: session.score,
      createdAt: session.createdAt,
      gameType: session.mode,
    };

    const response = await fetch("http://localhost:3006/api/game/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: cleanSession,
        gameId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to update game:", await response.text());
    } else {
      console.log("Game updated successfully");
    }
  } catch (error) {
    console.error("Error updating game:", error);
  }

  if (session.mode === "tournament" && session.matchId) {
    try {
      const tournamentResponse = await fetch(
        `http://tournament-service:3007/api/matches/${session.matchId}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            winnerId: winner,
            score: JSON.stringify(session.score),
          }),
        }
      );

      if (!tournamentResponse.ok) {
        console.error(
          "Failed to report tournament match result:",
          await tournamentResponse.text()
        );
      } else {
        console.log("Tournament match result reported successfully");
      }
    } catch (error) {
      console.error("Error reporting tournament match result:", error);
    }
  }

  try {
    const achievementResponse = await fetch(
      "http://localhost:3006/api/game/achievements",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          winner: winner,
        }),
      }
    );

    if (!achievementResponse.ok) {
      console.error(
        "Failed to update achievements:",
        await achievementResponse.text()
      );
    } else {
      console.log("Achievements updated successfully for winner:", winner);
    }
  } catch (error) {
    console.error("Error updating achievements:", error);
  }

  try {
    const rankResponse = await fetch(
      "http://localhost:3006/api/game/updateRanks",
      {
        method: "PUT",
      }
    );

    if (!rankResponse.ok) {
      console.error("Failed to update ranks:", await rankResponse.text());
    } else {
      console.log("Ranks updated successfully");
    }
  } catch (error) {
    console.error("Error updating ranks:", error);
  }
}

async function updateBall(session, gameId) {
  const ball = session.gameBoard.ball;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y <= 0 || ball.y >= GAME_HEIGHT) {
    ball.vy = -ball.vy;
    ball.y = Math.max(0, Math.min(GAME_HEIGHT, ball.y));
    ball.vy += (Math.random() - 0.5) * 0.01;
  }

  const paddleWidth = 0.5;
  const ballRadius = 0.2;

  if (ball.x - ballRadius <= paddleWidth && ball.vx < 0) {
    const p1Y = session.gameBoard.player1.paddleY;
    if (
      ball.y + ballRadius >= p1Y - PADDLE_HEIGHT / 2 &&
      ball.y - ballRadius <= p1Y + PADDLE_HEIGHT / 2
    ) {
      ball.vx = -ball.vx;
      ball.x = paddleWidth + ballRadius;
      const hitPos = (ball.y - p1Y) / (PADDLE_HEIGHT / 2);
      ball.vy += hitPos * 0.05;
      const speedMultiplier = 1.02;
      ball.vx *= speedMultiplier;
      ball.vy *= speedMultiplier;
    }
  }

  if (ball.x + ballRadius >= GAME_WIDTH - paddleWidth && ball.vx > 0) {
    const p2Y = session.gameBoard.player2.paddleY;
    if (
      ball.y + ballRadius >= p2Y - PADDLE_HEIGHT / 2 &&
      ball.y - ballRadius <= p2Y + PADDLE_HEIGHT / 2
    ) {
      ball.vx = -ball.vx;
      ball.x = GAME_WIDTH - paddleWidth - ballRadius;
      const hitPos = (ball.y - p2Y) / (PADDLE_HEIGHT / 2);
      ball.vy += hitPos * 0.05;
      const speedMultiplier = 1.02;
      ball.vx *= speedMultiplier;
      ball.vy *= speedMultiplier;
    }
  }

  if (ball.x < 0) {
    session.score.player2++;
    resetBall(session);
    broadcastScoreUpdate(gameId);
  } else if (ball.x > GAME_WIDTH) {
    session.score.player1++;
    resetBall(session);
    broadcastScoreUpdate(gameId);
  }

  const winningScore = session.mode === "tournament" ? 3 : 5;

  if (
    session.score.player1 >= winningScore ||
    session.score.player2 >= winningScore
  ) {
    const winner =
      session.score.player1 >= winningScore
        ? session.playerId1
        : session.playerId2;

    pauseGameWin(gameId);
    stopGameLoop(gameId);

    broadcastGameEnd(gameId, winner);

    await handleGameCompletion(gameId, session, winner);

    sessions.delete(gameId);
  }

  const maxSpeed = 0.4;
  if (Math.abs(ball.vx) > maxSpeed) ball.vx = maxSpeed * Math.sign(ball.vx);
  if (Math.abs(ball.vy) > maxSpeed) ball.vy = maxSpeed * Math.sign(ball.vy);

  const minSpeed = 0.1;
  if (Math.abs(ball.vx) < minSpeed) ball.vx = minSpeed * Math.sign(ball.vx);
  if (Math.abs(ball.vy) < minSpeed) ball.vy = minSpeed * Math.sign(ball.vy);
}

function resetBall(session) {
  const ball = session.gameBoard.ball;
  ball.x = GAME_WIDTH / 2;
  ball.y = GAME_HEIGHT / 2;
  ball.vx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
}

function broadcastGameState(gameId) {
  const session = sessions.get(gameId);
  if (!session) return;

  const updateMessage = JSON.stringify({
    type: "gameUpdate",
    gameId: gameId,
    gameBoard: session.gameBoard,
    score: session.score,
    gameStarted: session.gameStarted,
  });

  sendToPlayer(session.player1Sock, updateMessage);
  sendToPlayer(session.player2Sock, updateMessage);
}

function broadcastScoreUpdate(gameId) {
  const session = sessions.get(gameId);
  if (!session) return;

  const scoreMessage = JSON.stringify({
    type: "scoreUpdate",
    score: session.score,
  });

  sendToPlayer(session.player1Sock, scoreMessage);
  sendToPlayer(session.player2Sock, scoreMessage);
}

function broadcastGameEnd(gameId, winner) {
  const session = sessions.get(gameId);
  if (!session) return;

  const endMessage = JSON.stringify({
    type: "gameEnd",
    winner: winner,
    finalScore: session.score,
    gameId: gameId,
  });

  sendToPlayer(session.player1Sock, endMessage);
  sendToPlayer(session.player2Sock, endMessage);
}

function sendToPlayer(socket, message) {
  if (socket && socket.readyState === 1) {
    try {
      socket.send(message);
    } catch (error) {
      console.error("Error sending message to player:", error);
    }
  }
}

function handleReconnection(connection, playerId) {
  for (const [gameId, session] of sessions.entries()) {
    if (session.playerId1 === playerId || session.playerId2 === playerId) {
      const disInfo = disconnected.get(gameId);
      if (disInfo && disInfo.playerId === playerId) {
        clearTimeout(disInfo.timeout);
        if (disInfo.countdownIntervals) {
          disInfo.countdownIntervals.forEach((interval) =>
            clearTimeout(interval)
          );
        }
        disconnected.delete(gameId);
        console.log(
          ` Cleared disconnection timeout for ${playerId} in game ${gameId}`
        );
      }

      connection.gameId = gameId;
      playerConnections.set(playerId, connection);

      let playerNumber = 0;
      if (session.playerId1 === playerId) {
        session.player1Sock = connection;
        playerNumber = 1;
      } else if (session.playerId2 === playerId) {
        session.player2Sock = connection;
        playerNumber = 2;
      }

      console.log(
        ` ${playerId} reconnected to game ${gameId} as player ${playerNumber}`
      );

      console.log(` Connection status after ${playerId} joined:`, {
        player1Connected:
          !!session.player1Sock && session.player1Sock.readyState === 1,
        player2Connected:
          !!session.player2Sock && session.player2Sock.readyState === 1,
        waitingForPlayers: session.waitingForPlayers,
        gameStarted: session.gameStarted,
        isPaused: session.isPaused,
        pauseReason: session.pauseReason,
      });

      connection.send(
        JSON.stringify({
          type: "reconnection",
          gameId: gameId,
          playerNumber: playerNumber,
          opponent: playerNumber === 1 ? session.playerId2 : session.playerId1,
          gameBoard: session.gameBoard,
          score: session.score,
          mode: session.mode,
          isPaused: session.isPaused,
          pauseReason: session.pauseReason,
        })
      );

      const p1Connected =
        session.player1Sock && session.player1Sock.readyState === 1;
      const p2Connected =
        session.player2Sock && session.player2Sock.readyState === 1;

      console.log(
        ` Checking if game can start/resume: p1Connected=${p1Connected}, p2Connected=${p2Connected}, waitingForPlayers=${session.waitingForPlayers}, isPaused=${session.isPaused}`
      );

      if (p1Connected && p2Connected) {
        if (session.waitingForPlayers) {
          console.log(` Both players connected - starting game ${gameId}`);
          session.gameStarted = true;
          session.waitingForPlayers = false;
          session.isPaused = false;
          startGameLoop(gameId);
        } else if (
          session.isPaused &&
          session.pauseReason === "disconnection"
        ) {
          console.log(` Both players reconnected - resuming game ${gameId}`);
          resumeGame(gameId);
        }
      }

      return true;
    }
  }
  return false;
}

function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 1800000;

  for (const [id, session] of sessions.entries()) {
    if (session.createdAt && now - session.createdAt > maxAge) {
      if (!session.player1Sock && !session.player2Sock) {
        stopGameLoop(id);
        sessions.delete(id);
        disconnected.delete(id);
        console.log(`Cleaned up old session ${id}`);
      }
    }
  }
}

setInterval(cleanupOldSessions, 300000);

fastify.get("/ws/game", { websocket: true }, (connection, req) => {
  const { playerId, gameId: reconnectId } = url.parse(req.url, true).query;

  console.log(
    `WebSocket connection attempt - playerId: ${playerId}, gameId: ${reconnectId}`
  );

  if (!playerId) {
    console.log(" Connection rejected - no playerId");
    connection.close(1008, "playerId required");
    return;
  }

  connection.playerId = playerId;
  playerConnections.set(playerId, connection);

  console.log(`Player ${playerId} connected via WebSocket`);

  connection.on("message", (msg) => {
    try {
      const message = JSON.parse(msg.toString());
      console.log(" Received message from client:", message);

      if (message.type === "move") {
        console.log(" Processing move message:", message);
        const session = sessions.get(connection.gameId);
        if (!session) {
          console.log(" No session found for gameId:", connection.gameId);
          return;
        }

        let player = null;
        if (connection === session.player1Sock) {
          player = "player1";
        } else if (connection === session.player2Sock) {
          player = "player2";
        }

        if (player) {
          const currentY = session.gameBoard[player].paddleY;
          let newY = currentY;

          if (message.direction === "up") {
            console.log(" Moving up for player:", player);
            newY = Math.max(PADDLE_HEIGHT / 2, currentY - PADDLE_SPEED);
          } else if (message.direction === "down") {
            console.log(" Moving down for player:", player);
            newY = Math.min(
              GAME_HEIGHT - PADDLE_HEIGHT / 2,
              currentY + PADDLE_SPEED
            );
          }

          session.gameBoard[player].paddleY = newY;
          console.log(
            ` Player ${player} moved paddle from ${currentY} to ${newY}`
          );

          broadcastGameState(connection.gameId);
        } else {
          console.log("Could not identify player for connection");
        }
      }

      if (message.type === "paddlePosition") {
        const session = sessions.get(connection.gameId);
        if (!session) return;

        let player = null;
        if (connection === session.player1Sock) {
          player = "player1";
        } else if (connection === session.player2Sock) {
          player = "player2";
        }

        if (player) {
          const clampedY = Math.max(
            PADDLE_HEIGHT / 2,
            Math.min(GAME_HEIGHT - PADDLE_HEIGHT / 2, message.y)
          );
          session.gameBoard[player].paddleY = clampedY;
        }
      }

      if (message.type === "stop") {
        console.log(" Processing stop message for player connection");
      }
    } catch (error) {
      console.error(" Error parsing message:", error);
    }
  });

  connection.on("close", async () => {
    await handlePlayerDisconnection(connection);
  });

  connection.on("error", async (error) => {
    console.error("WebSocket error:", error);
    await handlePlayerDisconnection(connection);
  });

  if (reconnectId) {
    console.log(
      ` Attempting reconnection to game ${reconnectId} for player ${playerId}`
    );
    const session = sessions.get(reconnectId);
    if (
      session &&
      (session.playerId1 === playerId || session.playerId2 === playerId)
    ) {
      console.log(
        ` Reconnection successful for player ${playerId} to game ${reconnectId}`
      );
      handleReconnection(connection, playerId);
      return;
    } else {
      console.log(
        ` Reconnection failed - no valid session found for player ${playerId} in game ${reconnectId}`
      );
    }
  }

  console.log(` Checking for existing games for player ${playerId}`);
  if (handleReconnection(connection, playerId)) {
    console.log(` Auto-reconnection successful for player ${playerId}`);
    return;
  }

  console.log(
    ` No existing game found for player ${playerId} - sending connection confirmation`
  );
  connection.send(
    JSON.stringify({
      type: "connected",
      playerId: playerId,
      message: "Connected successfully. Waiting for game assignment.",
    })
  );
});

async function handlePlayerDisconnection(connection) {
  const gameId = connection.gameId;
  const playerId = connection.playerId;

  if (playerId) {
    playerConnections.delete(playerId);
  }

  if (!gameId || !sessions.has(gameId)) return;

  const session = sessions.get(gameId);
  let disconnectedPlayerId = null;
  let remainingPlayerId = null;
  let remainingPlayerSock = null;

  if (session.player1Sock === connection) {
    session.player1Sock = null;
    disconnectedPlayerId = session.playerId1;
    remainingPlayerId = session.playerId2;
    remainingPlayerSock = session.player2Sock;
    console.log(`Player 1 (${playerId}) disconnected from game ${gameId}`);
  } else if (session.player2Sock === connection) {
    session.player2Sock = null;
    disconnectedPlayerId = session.playerId2;
    remainingPlayerId = session.playerId1;
    remainingPlayerSock = session.player1Sock;
    console.log(`Player 2 (${playerId}) disconnected from game ${gameId}`);
  }

  if (disconnectedPlayerId) {
    console.log(
      `Player ${disconnectedPlayerId} disconnected from game ${gameId}. Starting 30-second timeout.`
    );

    pauseGame(gameId, "disconnection");

    if (remainingPlayerSock && remainingPlayerSock.readyState === 1) {
      sendToPlayer(
        remainingPlayerSock,
        JSON.stringify({
          type: "playerDisconnected",
          message:
            "Opponent disconnected. Waiting 30 seconds for reconnection...",
          disconnectedPlayer: disconnectedPlayerId,
          timeoutSeconds: 30,
        })
      );
    }

    disconnected.set(gameId, {
      disconnectedPlayerId,
      remainingPlayerId,
      remainingPlayerSock,
      timestamp: Date.now(),
      timeout: setTimeout(async () => {
        console.log(
          `Timeout reached for game ${gameId}. Player ${disconnectedPlayerId} loses by forfeit.`
        );

        stopGameLoop(gameId);

        const winner = remainingPlayerId;

        if (remainingPlayerSock && remainingPlayerSock.readyState === 1) {
          sendToPlayer(
            remainingPlayerSock,
            JSON.stringify({
              type: "playerDisconnected",
              message: "Opponent disconnected. You win by forfeit!",
              winner: winner,
              disconnectedPlayer: disconnectedPlayerId,
            })
          );
        }

        await updateAndEndGame(gameId, session, winner);

        disconnected.delete(gameId);
      }, 30000),
    });
  }
}

async function updateAndEndGame(gameId, session, winner) {
  if (winner === session.playerId1) {
    session.score.player1 = 3;
    session.score.player2 = 0;
  } else {
    session.score.player1 = 0;
    session.score.player2 = 3;
  }

  const cleanSession = {
    player1Id: session.playerId1,
    player2Id: session.playerId2,
    score: session.score,
    createdAt: session.createdAt,
    gameType: session.mode,
  };

  try {
    const response = await fetch("http://localhost:3006/api/game/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: cleanSession, gameId }),
    });

    if (!response.ok) {
      console.error(" Failed to update game:", await response.text());
    } else {
      console.log(" Game updated successfully with walkover score.");
    }
  } catch (error) {
    console.error(" Error updating game:", error);
  }

  try {
    const rankResponse = await fetch(
      "http://localhost:3006/api/game/updateRanks",
      {
        method: "PUT",
      }
    );

    if (!rankResponse.ok) {
      console.error(" Failed to update rank:", await rankResponse.text());
    } else {
      console.log(" Rank updated successfully.");
    }
  } catch (error) {
    console.error(" Error updating rank:", error);
  }

  stopGameLoop(gameId);

  try {
    const achievementResponse = await fetch(
      "http://localhost:3006/api/game/achievements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner }),
      }
    );

    if (!achievementResponse.ok) {
      console.error(
        " Failed to update achievements:",
        await achievementResponse.text()
      );
    } else {
      console.log(
        " Achievements updated successfully for disconnect winner:",
        winner
      );
    }
  } catch (error) {
    console.error(" Error updating achievements:", error);
  }

  const disconnectedPlayer =
    winner === session.playerId1 ? session.playerId2 : session.playerId1;

  try {
    const winnerNotificationResponse = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: winner,
          type: "GAME_FINISHED",
          title: "Victory by Forfeit",
          content: `You won the game! Your opponent disconnected and did not return within 30 seconds.`,
          sourceId: disconnectedPlayer,
          gameResult: {
            result: "win",
            reason: "opponent_disconnected",
            score: session.score,
          },
        }),
      }
    );

    if (!winnerNotificationResponse.ok) {
      console.error(
        " Failed to send winner notification:",
        await winnerNotificationResponse.text()
      );
    } else {
      console.log(" Winner notification sent successfully");
    }
  } catch (error) {
    console.error(" Error sending winner notification:", error);
  }

  try {
    const loserNotificationResponse = await fetch(
      "http://notification-service:3005/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: disconnectedPlayer,
          type: "GAME_FINISHED",
          title: "Game Lost by Disconnection",
          content: `You lost the game by disconnection. You had 30 seconds to reconnect but did not return in time.`,
          sourceId: winner,
          gameResult: {
            result: "loss",
            reason: "disconnection_timeout",
            score: session.score,
          },
        }),
      }
    );

    if (!loserNotificationResponse.ok) {
      console.error(
        " Failed to send loser notification:",
        await loserNotificationResponse.text()
      );
    } else {
      console.log(" Loser notification sent successfully");
    }
  } catch (error) {
    console.error(" Error sending loser notification:", error);
  }

  sessions.delete(gameId);
  disconnected.delete(gameId);
}

fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    activeGameLoops: gameLoops.size,
    connectedPlayers: playerConnections.size,
  };
});

fastify.get("/stats", async (request, reply) => {
  const stats = {
    totalSessions: sessions.size,
    activeGames: [...sessions.values()].filter((s) => s.gameStarted).length,
    pendingGames: [...sessions.values()].filter((s) => !s.gameStarted).length,
    disconnectedPlayers: disconnected.size,
    connectedPlayers: playerConnections.size,
  };
  return stats;
});

fastify.post("/api/game/reject/:gameId", async (request, reply) => {
  try {
    const gameId = request.params.gameId;
    console.log("rejectGameRequest gameId:", gameId);

    const session = sessions.get(gameId);
    if (!session) {
      console.log("Session not found for gameId:", gameId);
      return reply.code(404).send({ error: "Session not found." });
    }

    const player1Id = session.playerId1;
    const player2Id = session.playerId2;
    console.log("player1Id:", player1Id);
    console.log("player2Id:", player2Id);

    const [player1Profile, player2Profile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: parseInt(player1Id, 10) } }),
      prisma.userProfile.findUnique({ where: { id: parseInt(player2Id, 10) } }),
    ]);

    if (!player1Profile || !player2Profile) {
      return reply.status(404).send({ error: "One or both players not found" });
    }

    try {
      const notificationResponse = await fetch(
        "http://notification-service:3005/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: player1Profile.id,
            type: "GAME_REJECTED",
            title: "Game Invitation Rejected",
            content: `User ${player2Profile.displayName} has rejected your game invitation`,
            sourceId: player2Profile.id,
            requestId: gameId,
          }),
        }
      );

      if (!notificationResponse.ok) {
        console.error(
          "Failed to send game rejection notification:",
          await notificationResponse.text()
        );
      } else {
        console.log("Game rejection notification sent successfully");
      }
    } catch (err) {
      console.error("Error sending game rejection notification:", err);
    }

    stopGameLoop(gameId);
    sessions.delete(gameId);
    disconnected.delete(gameId);

    if (session.player1Sock) {
      sendToPlayer(
        session.player1Sock,
        JSON.stringify({
          type: "gameRejected",
          gameId: gameId,
          message: "Your game invitation was rejected",
        })
      );
      session.player1Sock.gameId = null;
    }

    if (session.player2Sock) {
      sendToPlayer(
        session.player2Sock,
        JSON.stringify({
          type: "gameRejected",
          gameId: gameId,
          message: "Game invitation rejected successfully",
        })
      );
      session.player2Sock.gameId = null;
      if (session.invitationTimeout) {
        clearTimeout(session.invitationTimeout);
        session.invitationTimeout = null;
        console.log(`Cleared invitation timeout for game ${gameId}`);
      }
    }

    return reply.send({
      success: true,
      message: "Game invitation rejected successfully",
      gameId: gameId,
    });
  } catch (error) {
    console.error("Error in reject game endpoint:", error);
    return reply.status(500).send({
      error: "Failed to reject game invitation",
      details: error.message,
    });
  }
});

fastify.get("/api/game/:gameId", async (request, reply) => {
  const { gameId } = request.params;
  const session = sessions.get(gameId);

  if (!session) {
    return reply.status(404).send({ error: "Game not found" });
  }

  return {
    gameId: gameId,
    playerId1: session.playerId1,
    playerId2: session.playerId2,
    mode: session.mode,
    score: session.score,
    gameStarted: session.gameStarted,
    waitingForPlayers: session.waitingForPlayers,
    playersConnected: {
      player1: !!session.player1Sock,
      player2: !!session.player2Sock,
    },
    createdAt: session.createdAt,
  };
});

fastify.register(gameRoutes, { prefix: "/api/game" });

await fastify.listen({ port: 3006, host: "0.0.0.0" });
console.log("Pong server listening on port 3006");
