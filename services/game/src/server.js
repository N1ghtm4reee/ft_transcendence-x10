import Fastify from "fastify";
import websocket from "@fastify/websocket";
import url from "url";
import gameRoutes from "./routes/game.routes.js";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import fastifyCors from "@fastify/cors";

const prisma = new PrismaClient();

const fastify = Fastify();
await fastify.register(websocket);

// Register CORS support
fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
});
// Use a Map for better performance with object keys
const sessions = new Map();
const gameLoops = new Map();
const disconnected = new Map();
const playerConnections = new Map(); // Map playerId to websocket connection

// Game constants
const GAME_WIDTH = 20;
const GAME_HEIGHT = 10;
const BALL_SPEED = 0.15;
const PADDLE_HEIGHT = 2;
const PADDLE_SPEED = 0.5;
const RECONNECT_TIMEOUT = 30000; // 30 seconds
const GAME_PAUSE_TIMEOUT = 3000; // 3 seconds grace period before pausing

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
    matchId, // Store tournament match ID
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
    // send notification to the sender that the game was accepted
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
    // Stop any game loop if it exists
    stopGameLoop(gameId);
    
    // Notify connected players that the invitation expired
    if (session.player1Sock) {
      sendToPlayer(session.player1Sock, JSON.stringify({
        type: "gameExpired",
        gameId: gameId,
        message: "Game invitation has expired"
      }));
      session.player1Sock.gameId = null;
    }
    
    if (session.player2Sock) {
      sendToPlayer(session.player2Sock, JSON.stringify({
        type: "gameExpired", 
        gameId: gameId,
        message: "Game invitation has expired"
      }));
      session.player2Sock.gameId = null;
    }
    
    // Clean up the session
    sessions.delete(gameId);
    disconnected.delete(gameId);
  }
}



const getBlockedStatus = async (userId1, userId2) => {
        return await prisma.blockedUser.findFirst({
            where: {
                OR: [
                    { blockerId: Number(userId1), blockedId: Number(userId2) },
                    { blockerId: Number(userId2), blockedId: Number(userId1) }
                ]
            },
            select: { id: true, blockerId: true, blockedId: true }
        });
};

// POST /challenge endpoint to create a new game
fastify.post("/api/game/challenge", async (request, reply) => {
  try {
    const playerId1 = request.headers["x-user-id"];
    const playerId2 = request.query.opponentId;
    const mode = request.query.mode || "classic";
    const matchId = request.query.matchId || null; // Get tournament match ID

    // get both players profiles
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
    // Validate required fields
    if (!playerId1 || !playerId2) {
      return reply.status(400).send({
        error: "Both playerId1 and playerId2 are required",
      });
    }


    const isBlocked = getBlockedStatus(playerId1, playerId2);
    if (isBlocked) {
      return reply.status(401).send({
        error: "cannot play with a blocked user"
      })
    }
    // Check if players are already in active games
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

    // Validate mode
    const validModes = ["classic", "tournament"];
    const gameMode = validModes.includes(mode) ? mode : "classic";

    // Create the game session
    const gameId = createGameSession(playerId1, playerId2, gameMode, matchId);

    // Check if players are already connected via websocket (but not in any game)
    const player1Connection = playerConnections.get(playerId1);
    const player2Connection = playerConnections.get(playerId2);

    const session = sessions.get(gameId);

    // Assign websocket connections if available and not already in a game
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

    // send in notification service game invite (TODO)
    try {
      // add timeout for invitation and clear game session
      const timeoutID = setTimeout(() => {
        clearGameId(gameId);
      }, 5000);
      
      // store the timeout id so i can clear it if accpeted or rejected
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
    // Notify connected players about the game
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

    // Start game if both players are connected
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

      // If game is paused due to disconnection, don't update
      if (currentSession.isPaused) {
        return;
      }

      if (!p1Connected || !p2Connected) {
        console.log(
          `⏸️ Game ${gameId} pausing - p1Connected: ${p1Connected}, p2Connected: ${p2Connected}`
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
  ); // 60 FPS
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
    console.log(`🛑 Game ${gameId} paused due to ${reason}`);

    // Notify players about game pause
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
      console.log(`▶️ Game ${gameId} resumed`);

      // Notify players about game resume
      const message = JSON.stringify({
        type: "gameResumed",
        message: "Game resumed!",
        gameBoard: session.gameBoard,
        score: session.score,
      });

      sendToPlayer(session.player1Sock, message);
      sendToPlayer(session.player2Sock, message);

      // Restart game loop if needed
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

// async function updateBall(session, gameId) {
//   const ball = session.gameBoard.ball;

//   ball.x += ball.vx;
//   ball.y += ball.vy;

//   if (ball.y <= 0 || ball.y >= GAME_HEIGHT) {
//     ball.vy = -ball.vy;
//     ball.y = Math.max(0, Math.min(GAME_HEIGHT, ball.y));
//     ball.vy += (Math.random() - 0.5) * 0.01;
//   }

//   const paddleWidth = 0.5;
//   const ballRadius = 0.2; // Define ball radius for server collision detection

//   // Left paddle collision (Player 1)
//   if (ball.x - ballRadius <= paddleWidth && ball.vx < 0) {
//     const p1Y = session.gameBoard.player1.paddleY;
//     if (
//       ball.y + ballRadius >= p1Y - PADDLE_HEIGHT / 2 &&
//       ball.y - ballRadius <= p1Y + PADDLE_HEIGHT / 2
//     ) {
//       ball.vx = -ball.vx;
//       ball.x = paddleWidth + ballRadius;
//       const hitPos = (ball.y - p1Y) / (PADDLE_HEIGHT / 2);
//       ball.vy += hitPos * 0.05;
//       const speedMultiplier = 1.02;
//       ball.vx *= speedMultiplier;
//       ball.vy *= speedMultiplier;
//     }
//   }

//   // Right paddle collision (Player 2)
//   if (ball.x + ballRadius >= GAME_WIDTH - paddleWidth && ball.vx > 0) {
//     const p2Y = session.gameBoard.player2.paddleY;
//     if (
//       ball.y + ballRadius >= p2Y - PADDLE_HEIGHT / 2 &&
//       ball.y - ballRadius <= p2Y + PADDLE_HEIGHT / 2
//     ) {
//       ball.vx = -ball.vx;
//       ball.x = GAME_WIDTH - paddleWidth - ballRadius;
//       const hitPos = (ball.y - p2Y) / (PADDLE_HEIGHT / 2);
//       ball.vy += hitPos * 0.05;
//       const speedMultiplier = 1.02;
//       ball.vx *= speedMultiplier;
//       ball.vy *= speedMultiplier;
//     }
//   }

//   if (ball.x < 0) {
//     session.score.player2++;
//     resetBall(session);
//     broadcastScoreUpdate(gameId);
//   } else if (ball.x > GAME_WIDTH) {
//     session.score.player1++;
//     resetBall(session);
//     broadcastScoreUpdate(gameId);
//   }

//   const winningScore = session.mode === "tournament" ? 3 : 5;

//   if (
//     session.score.player1 >= winningScore ||
//     session.score.player2 >= winningScore
//   ) {
//     const winner =
//       session.score.player1 >= winningScore
//         ? session.playerId1
//         : session.playerId2;
//     // const loser =
//     //   session.score.player1 >= winningScore
//     //     ? session.playerId2
//     //     : session.playerId1;
//     pauseGameWin(gameId);
//     stopGameLoop(gameId);

//     // Broadcast game end
//     broadcastGameEnd(gameId, winner);

//     try {
//       const cleanSession = {
//         player1Id: session.playerId1,
//         player2Id: session.playerId2,
//         score: session.score,
//         createdAt: session.createdAt,
//         gameType: session.mode,
//       };

//       const response = await fetch("http://localhost:3006/api/game/update", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           session: cleanSession,
//           gameId,
//         }),
//       });

//       if (!response.ok) {
//         console.error("Failed to update game:", await response.text());
//       } else {
//         console.log("Game updated successfully");
//       }
//     } catch (error) {
//       console.error("Error updating game:", error);
//     }

//     // Report tournament match result if this is a tournament game
//     if (session.mode === "tournament" && session.matchId) {
//       try {
//         const tournamentResponse = await fetch(
//           `http://tournament-service:3007/api/matches/${session.matchId}/report`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               winnerId: winner,
//               score: JSON.stringify(session.score),
//             }),
//           }
//         );

//         if (!tournamentResponse.ok) {
//           console.error(
//             "Failed to report tournament match result:",
//             await tournamentResponse.text()
//           );
//         } else {
//           console.log("Tournament match result reported successfully");
//         }
//       } catch (error) {
//         console.error("Error reporting tournament match result:", error);
//       }
//     }

//     // Update achievements
//     try {
//     const achievementResponse = await fetch('http://localhost:3006/api/game/achievements', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         winner: winner
//       })
//     });

//     if (!achievementResponse.ok) {
//       console.error('Failed to update achievements:', await achievementResponse.text());
//     } else {
//       console.log('Achievements updated successfully for winner:', winner);
//     }
//   } catch(error) {
//     console.error('Error updating achievements:', error);
//   }

//     sessions.delete(gameId);
//   }

//   const maxSpeed = 0.4;
//   if (Math.abs(ball.vx) > maxSpeed) ball.vx = maxSpeed * Math.sign(ball.vx);
//   if (Math.abs(ball.vy) > maxSpeed) ball.vy = maxSpeed * Math.sign(ball.vy);

//   const minSpeed = 0.1;
//   if (Math.abs(ball.vx) < minSpeed) ball.vx = minSpeed * Math.sign(ball.vx);
//   if (Math.abs(ball.vy) < minSpeed) ball.vy = minSpeed * Math.sign(ball.vy);
// }

async function handleGameCompletion(gameId, session, winner) {
  try {
    // Update game in database
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

  // Report tournament match result if this is a tournament game
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

  // Update achievements
  try {
    const achievementResponse = await fetch('http://localhost:3006/api/game/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        winner: winner
      })
    });

    if (!achievementResponse.ok) {
      console.error('Failed to update achievements:', await achievementResponse.text());
    } else {
      console.log('Achievements updated successfully for winner:', winner);
    }
  } catch(error) {
    console.error('Error updating achievements:', error);
  }

  // Update ranks
  try {
    const rankResponse = await fetch("http://localhost:3006/api/game/updateRanks", {
      method: "PUT",
    });

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

  // Left paddle collision (Player 1)
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

  // Right paddle collision (Player 2)
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
  // Look for games where this player is expected
  for (const [gameId, session] of sessions.entries()) {
    if (session.playerId1 === playerId || session.playerId2 === playerId) {
      // Clear any pending disconnection timeout
      const disInfo = disconnected.get(gameId);
      if (disInfo && disInfo.playerId === playerId) {
        clearTimeout(disInfo.timeout);
        disconnected.delete(gameId);
        console.log(
          `⏰ Cleared disconnection timeout for ${playerId} in game ${gameId}`
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
        `✅ ${playerId} reconnected to game ${gameId} as player ${playerNumber}`
      );

      // Log current connection status
      console.log(`🔍 Connection status after ${playerId} joined:`, {
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

      // Resume game if both players are connected
      const p1Connected =
        session.player1Sock && session.player1Sock.readyState === 1;
      const p2Connected =
        session.player2Sock && session.player2Sock.readyState === 1;

      console.log(
        `🎮 Checking if game can start/resume: p1Connected=${p1Connected}, p2Connected=${p2Connected}, waitingForPlayers=${session.waitingForPlayers}, isPaused=${session.isPaused}`
      );

      if (p1Connected && p2Connected) {
        if (session.waitingForPlayers) {
          console.log(`🚀 Both players connected - starting game ${gameId}`);
          session.gameStarted = true;
          session.waitingForPlayers = false;
          session.isPaused = false;
          startGameLoop(gameId);
        } else if (
          session.isPaused &&
          session.pauseReason === "disconnection"
        ) {
          console.log(`🔄 Both players reconnected - resuming game ${gameId}`);
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
  const maxAge = 1800000; // 30 minutes

  for (const [id, session] of sessions.entries()) {
    if (session.createdAt && now - session.createdAt > maxAge) {
      // Clean up sessions with no active players
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

// WebSocket connection endpoint - players connect with their playerId
fastify.get("/ws", { websocket: true }, (connection, req) => {
  const { playerId, gameId: reconnectId } = url.parse(req.url, true).query;

  console.log(
    `🔗 WebSocket connection attempt - playerId: ${playerId}, gameId: ${reconnectId}`
  );

  if (!playerId) {
    console.log("❌ Connection rejected - no playerId");
    connection.close(1008, "playerId required");
    return;
  }

  connection.playerId = playerId;
  playerConnections.set(playerId, connection);

  console.log(`✅ Player ${playerId} connected via WebSocket`);

  // Set up message handler FIRST - before any reconnection logic
  connection.on("message", (msg) => {
    try {
      const message = JSON.parse(msg.toString());
      console.log("📨 Received message from client:", message);

      if (message.type === "move") {
        console.log("🎮 Processing move message:", message);
        const session = sessions.get(connection.gameId);
        if (!session) {
          console.log("❌ No session found for gameId:", connection.gameId);
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
            console.log("🔼 Moving up for player:", player);
            newY = Math.max(PADDLE_HEIGHT / 2, currentY - PADDLE_SPEED);
          } else if (message.direction === "down") {
            console.log("🔽 Moving down for player:", player);
            newY = Math.min(
              GAME_HEIGHT - PADDLE_HEIGHT / 2,
              currentY + PADDLE_SPEED
            );
          }

          session.gameBoard[player].paddleY = newY;
          console.log(
            `✅ Player ${player} moved paddle from ${currentY} to ${newY}`
          );

          // Immediately broadcast the updated paddle position
          broadcastGameState(connection.gameId);
        } else {
          console.log("❌ Could not identify player for connection");
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
          // Ensure the position is within valid bounds
          const clampedY = Math.max(
            PADDLE_HEIGHT / 2,
            Math.min(GAME_HEIGHT - PADDLE_HEIGHT / 2, message.y)
          );
          session.gameBoard[player].paddleY = clampedY;
        }
      }

      if (message.type === "stop") {
        console.log("🛑 Processing stop message for player connection");
        // No need to update paddle position for stop, just log it
      }
    } catch (error) {
      console.error("❌ Error parsing message:", error);
    }
  });

  connection.on("close", () => {
    handlePlayerDisconnection(connection);
  });

  connection.on("error", (error) => {
    console.error("WebSocket error:", error);
    handlePlayerDisconnection(connection);
  });

  // Handle explicit reconnection to a specific game
  if (reconnectId) {
    console.log(
      `🔄 Attempting reconnection to game ${reconnectId} for player ${playerId}`
    );
    const session = sessions.get(reconnectId);
    if (
      session &&
      (session.playerId1 === playerId || session.playerId2 === playerId)
    ) {
      console.log(
        `✅ Reconnection successful for player ${playerId} to game ${reconnectId}`
      );
      handleReconnection(connection, playerId);
      return;
    } else {
      console.log(
        `❌ Reconnection failed - no valid session found for player ${playerId} in game ${reconnectId}`
      );
    }
  }

  // Handle automatic reconnection based on existing games
  console.log(`🔍 Checking for existing games for player ${playerId}`);
  if (handleReconnection(connection, playerId)) {
    console.log(`✅ Auto-reconnection successful for player ${playerId}`);
    return;
  }

  console.log(
    `📝 No existing game found for player ${playerId} - sending connection confirmation`
  );
  // Send connection confirmation
  connection.send(
    JSON.stringify({
      type: "connected",
      playerId: playerId,
      message: "Connected successfully. Waiting for game assignment.",
    })
  );
});

function handlePlayerDisconnection(connection) {
  const gameId = connection.gameId;
  const playerId = connection.playerId;

  // Remove from playerConnections
  if (playerId) {
    playerConnections.delete(playerId);
  }

  if (!gameId || !sessions.has(gameId)) return;

  const session = sessions.get(gameId);
  let disconnectedPlayerId = null;
  let remainingPlayerSock = null;

  if (session.player1Sock === connection) {
    session.player1Sock = null;
    disconnectedPlayerId = session.playerId1;
    remainingPlayerSock = session.player2Sock;
    console.log(`Player 1 (${playerId}) disconnected from game ${gameId}`);
  } else if (session.player2Sock === connection) {
    session.player2Sock = null;
    disconnectedPlayerId = session.playerId2;
    remainingPlayerSock = session.player1Sock;
    console.log(`Player 2 (${playerId}) disconnected from game ${gameId}`);
  }

  if (disconnectedPlayerId) {
    // Pause the game immediately
    pauseGame(gameId, "disconnection");

    // Notify remaining player about disconnection
    if (remainingPlayerSock && remainingPlayerSock.readyState === 1) {
      sendToPlayer(
        remainingPlayerSock,
        JSON.stringify({
          type: "playerDisconnected",
          message: "Opponent disconnected. Waiting for reconnection...",
          disconnectedPlayer: disconnectedPlayerId,
        })
      );
    }

    // Check if this is a second disconnection (both players disconnected)
    const existingDisconnection = disconnected.get(gameId);
    if (existingDisconnection) {
      clearTimeout(existingDisconnection.timeout);
      console.log(
        `Both players disconnected from game ${gameId}. Ending game.`
      );

      const winner =
        existingDisconnection.playerId === session.playerId1
          ? "player2"
          : "player1";
      updateAndEndGame(gameId, session, winner);
      return;
    }

    // Set up a new timeout for this disconnection
    const timeout = setTimeout(async () => {
      console.log(
        `${disconnectedPlayerId} did not reconnect to game ${gameId} in time. Ending game.`
      );

      const winner =
        disconnectedPlayerId === session.playerId1
          ? session.playerId2
          : session.playerId1;

      await updateAndEndGame(gameId, session, winner);

      const remainingSession = sessions.get(gameId);
      if (
        remainingSession &&
        remainingPlayerSock &&
        remainingPlayerSock.readyState === 1
      ) {
        sendToPlayer(
          remainingPlayerSock,
          JSON.stringify({
            type: "gameEnded",
            reason: "Opponent did not reconnect",
            winner: winner,
          })
        );
      }

      // Clean up disconnection tracking
      disconnected.delete(gameId);
    }, RECONNECT_TIMEOUT);

    disconnected.set(gameId, {
      playerId: disconnectedPlayerId,
      time: Date.now(),
      timeout: timeout,
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
    player1username: session.playerId1,
    player2username: session.playerId2,
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
      console.error("❌ Failed to update game:", await response.text());
    } else {
      console.log("✅ Game updated successfully with walkover score.");
    }
  } catch (error) {
    console.error("⚠️ Error updating game:", error);
  }

  try {
    const rankResponse = await fetch("http://localhost:3006/api/game/updateRanks", {
      method: "PUT",
    });

    if (!rankResponse.ok) {
      console.error("❌ Failed to update rank:", await rankResponse.text());
    } else {
      console.log("✅ Rank updated successfully.");
    }
  } catch (error) {
    console.error("⚠️ Error updating rank:", error);
  }

  stopGameLoop(gameId);

  try {
    const achievementResponse = await fetch("http://localhost:3006/api/game/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner }),
    });

    if (!achievementResponse.ok) {
      console.error("❌ Failed to update achievements:", await achievementResponse.text());
    } else {
      console.log("🏆 Achievements updated successfully for disconnect winner:", winner);
    }
  } catch (error) {
    console.error("⚠️ Error updating achievements:", error);
  }

  sessions.delete(gameId);
  disconnected.delete(gameId);
}


// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    activeGameLoops: gameLoops.size,
    connectedPlayers: playerConnections.size,
  };
});

// Stats endpoint
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

    // Use the correct property names from the session object
    const player1Id = session.playerId1; // Changed from player1Id
    const player2Id = session.playerId2; // Changed from player2Id
    console.log("player1Id:", player1Id);
    console.log("player2Id:", player2Id);

    // Get both players profiles using the correct variable names
    const [player1Profile, player2Profile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: parseInt(player1Id, 10) } }), // Fixed variable name
      prisma.userProfile.findUnique({ where: { id: parseInt(player2Id, 10) } }), // Fixed variable name
    ]);

    if (!player1Profile || !player2Profile) {
      return reply.status(404).send({ error: "One or both players not found" });
    }

    // Notify the inviter (player1) about the rejection
    try {
      const notificationResponse = await fetch(
        "http://notification-service:3005/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: player1Profile.id, // Use the profile id
            type: "GAME_REJECTED",
            title: "Game Invitation Rejected",
            content: `User ${player2Profile.displayName} has rejected your game invitation`,
            sourceId: player2Profile.id, // Use the profile id
            requestId: gameId, // Changed from gameId to requestId to match your notification structure
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

    // Clean up the session since the game was rejected
    stopGameLoop(gameId);
    sessions.delete(gameId);
    disconnected.delete(gameId);

    // Also notify any connected players via WebSocket
    if (session.player1Sock) {
      sendToPlayer(
        session.player1Sock,
        JSON.stringify({
          type: "gameRejected",
          gameId: gameId,
          message: "Your game invitation was rejected",
        })
      );
      // Clear the gameId from the connection
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
      // Clear the gameId from the connection
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

fastify.get("/game/:gameId", async (request, reply) => {
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
