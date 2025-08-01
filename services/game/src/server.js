import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import url from 'url'
import gameRoutes from './routes/game.routes.js';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const fastify = Fastify()
await fastify.register(websocket)

// Use a Map for better performance with object keys
const sessions = new Map();
const gameLoops = new Map();
const disconnected = new Map();

let waitingGameId = null;

// Game constants
const GAME_WIDTH = 20;
const GAME_HEIGHT = 10;
const BALL_SPEED = 0.15;
const PADDLE_HEIGHT = 2;
const PADDLE_SPEED = 0.5;
const RECONNECT_TIMEOUT = 5000; // 30 seconds

function createGameSession() {
  const gameId = randomUUID();
  const session = {
    player1Sock: null,
    player1username: null,
    player2Sock: null,
    player2username: null,
    gameBoard: {
      player1: {
        paddleY: GAME_HEIGHT / 2
      },
      player2: {
        paddleY: GAME_HEIGHT / 2
      },
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        vy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
      }
    },
    score: {
      player1: 0,
      player2: 0
    },
    gameStarted: false,
    createdAt: Date.now()
  };
  sessions.set(gameId, session);
  return gameId;
}

function startGameLoop(gameId) {
  if (gameLoops.has(gameId)) return;

  console.log(`Starting game loop for game ${gameId}`);
  
  const session = sessions.get(gameId);
  if (!session) return;

  gameLoops.set(gameId, setInterval(() => {
    if (!session || !session.gameStarted) {
      return;
    }

    const p1Connected = session.player1Sock && session.player1Sock.readyState === 1;
    const p2Connected = session.player2Sock && session.player2Sock.readyState === 1;
    
    if (!p1Connected || !p2Connected) {
      // This should be handled by the close event, but as a fallback
      pauseGame(gameId);
      return;
    }

    updateBall(session, gameId);
    broadcastGameState(gameId);
  }, 1000 / 60)); // 60 FPS
}

function pauseGame(gameId) {
  const session = sessions.get(gameId);
  if (session) {
    session.gameStarted = false;
    console.log(`Game ${gameId} paused due to player disconnection`);
  }
}

function stopGameLoop(gameId) {
  if (gameLoops.has(gameId)) {
    clearInterval(gameLoops.get(gameId));
    gameLoops.delete(gameId);
    console.log(`Game loop stopped for game ${gameId}`);
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

  if (ball.x <= paddleWidth && ball.vx < 0) {
    const p1Y = session.gameBoard.player1.paddleY;
    if (ball.y >= p1Y - PADDLE_HEIGHT / 2 && ball.y <= p1Y + PADDLE_HEIGHT / 2) {
      ball.vx = -ball.vx;
      ball.x = paddleWidth;
      const hitPos = (ball.y - p1Y) / (PADDLE_HEIGHT / 2);
      ball.vy += hitPos * 0.05;
      const speedMultiplier = 1.02;
      ball.vx *= speedMultiplier;
      ball.vy *= speedMultiplier;
    }
  }

  if (ball.x >= GAME_WIDTH - paddleWidth && ball.vx > 0) {
    const p2Y = session.gameBoard.player2.paddleY;
    if (ball.y >= p2Y - PADDLE_HEIGHT / 2 && ball.y <= p2Y + PADDLE_HEIGHT / 2) {
      ball.vx = -ball.vx;
      ball.x = GAME_WIDTH - paddleWidth;
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

  if (session.score.player1 >= 5 || session.score.player2 >= 5) {
    pauseGame(gameId);

    try {
      const cleanSession = {
        player1username: session.player1username,
        player2username: session.player2username,
        score: session.score,
        createdAt: session.createdAt,
        gameType: session.gameType || 'classic',
      };
      const response = await fetch('http://localhost:3006/api/game/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: cleanSession,
          gameId,
        })
      });

      if (!response.ok) {
        console.error('Failed to update game:', await response.text());
      } else {
        console.log('Game updated successfully');
      }
    } catch (error) {
      console.error('Error updating game:', error);
    }
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
    type: 'gameUpdate',
    gameId: gameId,
    gameBoard: session.gameBoard,
    score: session.score,
    gameStarted: session.gameStarted
  });

  sendToPlayer(session.player1Sock, updateMessage);
  sendToPlayer(session.player2Sock, updateMessage);
}

function broadcastScoreUpdate(gameId) {
  const session = sessions.get(gameId);
  if (!session) return;

  const scoreMessage = JSON.stringify({
    type: 'scoreUpdate',
    score: session.score
  });
  
  sendToPlayer(session.player1Sock, scoreMessage);
  sendToPlayer(session.player2Sock, scoreMessage);
}

function sendToPlayer(socket, message) {
  if (socket && socket.readyState === 1) {
    try {
      socket.send(message);
    } catch (error) {
      console.error('Error sending message to player:', error);
    }
  }
}

function handleReconnection(connection, username) {
  for (const [gameId, dis] of disconnected.entries()) {
    if (dis.username === username) {
      clearTimeout(dis.timeout);
      disconnected.delete(gameId);

      const session = sessions.get(gameId);
      if (!session) continue;

      connection.gameId = gameId;
      
      let playerNumber = 0;
      if (session.player1username === username) {
        session.player1Sock = connection;
        playerNumber = 1;
      } else if (session.player2username === username) {
        session.player2Sock = connection;
        playerNumber = 2;
      } else {
        continue;
      }

      console.log(`${username} reconnected to game ${gameId} as player ${playerNumber}`);
      console.log(`Score: ${session.score.player1} - ${session.score.player2}`);

      connection.send(JSON.stringify({
        type: 'reconnection',
        gameId: gameId,
        playerNumber: playerNumber,
        gameBoard: session.gameBoard,
        score: session.score
      }));

      // Resume game if both players are connected
      const p1Connected = session.player1Sock && session.player1Sock.readyState === 1;
      const p2Connected = session.player2Sock && session.player2Sock.readyState === 1;
      
      if (p1Connected && p2Connected) {
        session.gameStarted = true;
        startGameLoop(gameId);
        broadcastGameState(gameId); // Send a final state update to sync both clients
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

fastify.get('/game', { websocket: true }, (connection, req) => {
  const { username, gameId: reconnectId } = url.parse(req.url, true).query;
  
  if (!username) {
    connection.close(1008, 'Username required');
    return;
  }
  
  connection.username = username;

  // Handle explicit reconnection
  if (reconnectId) {
    const session = sessions.get(reconnectId);
    if (session) {
      let isReconnected = false;
      if (session.player1username === username) {
        session.player1Sock = connection;
        connection.gameId = reconnectId;
        isReconnected = true;
      } else if (session.player2username === username) {
        session.player2Sock = connection;
        connection.gameId = reconnectId;
        isReconnected = true;
      }

      if (isReconnected) {
        // Clear any pending timeout for this player
        const disInfo = disconnected.get(reconnectId);
        if (disInfo && disInfo.username === username) {
          clearTimeout(disInfo.timeout);
          disconnected.delete(reconnectId);
        }

        console.log(`${username} reconnected to game ${reconnectId}`);
        const p1Connected = session.player1Sock && session.player1Sock.readyState === 1;
        const p2Connected = session.player2Sock && session.player2Sock.readyState === 1;
        
        if (p1Connected && p2Connected) {
          session.gameStarted = true;
          startGameLoop(reconnectId);
          broadcastGameState(reconnectId);
        }
        
        return;
      }
    }
  }
  
  // Handle automatic reconnection based on previous disconnection
  if (handleReconnection(connection, username)) {
    return;
  }

  let currentGameId;

  // Find a waiting game or create a new one
  if (waitingGameId && sessions.has(waitingGameId)) {
    currentGameId = waitingGameId;
  } else {
    currentGameId = createGameSession();
    waitingGameId = currentGameId;
  }

  connection.gameId = currentGameId;
  const session = sessions.get(currentGameId);

  if (!session.player1Sock) {
    session.player1Sock = connection;
    session.player1username = username;
    console.log(`Game ${currentGameId}: Player 1 (${username}) joined`);
    
    connection.send(JSON.stringify({
      type: 'playerAssignment',
      gameId: currentGameId,
      playerNumber: 1,
      gameBoard: session.gameBoard,
      score: session.score,
      waitingForPlayer: true
    }));
  } else if (!session.player2Sock) {
    session.player2Sock = connection;
    session.player2username = username;
    console.log(`Game ${currentGameId}: Player 2 (${username}) joined`);
    
    connection.send(JSON.stringify({
      type: 'playerAssignment',
      gameId: currentGameId,
      playerNumber: 2,
      gameBoard: session.gameBoard,
      score: session.score,
      waitingForPlayer: false
    }));

    sendToPlayer(session.player1Sock, JSON.stringify({
      type: 'playerJoined',
      waitingForPlayer: false
    }));

    session.gameStarted = true;
    startGameLoop(currentGameId);
    console.log(`Game ${currentGameId} started!`);

    // Reset waiting game ID
    waitingGameId = null;
  } else {
    connection.send(JSON.stringify({
      type: 'error',
      message: 'Game is full'
    }));
    connection.close();
  }

  connection.on('message', msg => {
    try {
      const message = JSON.parse(msg.toString());
      if (message.type === 'move') {
        const session = sessions.get(connection.gameId);
        if (!session) return;
        
        let player = null;
        if (connection === session.player1Sock) {
          player = 'player1';
        } else if (connection === session.player2Sock) {
          player = 'player2';
        }

        if (player) {
          const currentY = session.gameBoard[player].paddleY;
          let newY = currentY;

          if (message.direction === 'up') {
            newY = Math.max(PADDLE_HEIGHT / 2, currentY - PADDLE_SPEED);
          } else if (message.direction === 'down') {
            newY = Math.min(GAME_HEIGHT - PADDLE_HEIGHT / 2, currentY + PADDLE_SPEED);
          }
          session.gameBoard[player].paddleY = newY;
          
          if (!session.gameStarted) {
            broadcastGameState(connection.gameId);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  connection.on('close', () => {
    handlePlayerDisconnection(connection);
  });

  connection.on('error', (error) => {
    console.error('WebSocket error:', error);
    handlePlayerDisconnection(connection);
  });
});

function handlePlayerDisconnection(connection) {
  const gameId = connection.gameId;
  const username = connection.username;
  
  if (!gameId || !sessions.has(gameId)) return;
  
  const session = sessions.get(gameId);
  let disconnectedPlayerUsername = null;
  let remainingPlayerSock = null;

  if (session.player1Sock === connection) {
    session.player1Sock = null;
    disconnectedPlayerUsername = session.player1username;
    remainingPlayerSock = session.player2Sock;
    console.log(`Player 1 (${username}) disconnected from game ${gameId}`);
  } else if (session.player2Sock === connection) {
    session.player2Sock = null;
    disconnectedPlayerUsername = session.player2username;
    remainingPlayerSock = session.player1Sock;
    console.log(`Player 2 (${username}) disconnected from game ${gameId}`);
  }

  if (disconnectedPlayerUsername) {
    pauseGame(gameId);
    
    sendToPlayer(remainingPlayerSock, JSON.stringify({
      type: 'playerDisconnected',
      message: 'Opponent disconnected. Waiting for reconnection...'
    }));

    const existingDisconnection = disconnected.get(gameId);
    if (existingDisconnection) {
      clearTimeout(existingDisconnection.timeout);
      console.log(`Both players disconnected from game ${gameId}. Ending game.`);
      
      const winner = existingDisconnection.username === session.player1username ? 'player2' : 'player1';
      updateAndEndGame(gameId, session, winner);
      
      return;
    }

    // Set up a new timeout for this disconnection
    const timeout = setTimeout(async () => {
      console.log(`${disconnectedPlayerUsername} did not reconnect to game ${gameId} in time. Ending game.`);
      
      const winner = disconnectedPlayerUsername === session.player1username ? 'player2' : 'player1';
      
      await updateAndEndGame(gameId, session, winner);
      
      const remainingSession = sessions.get(gameId);
      if (remainingSession && remainingPlayerSock) {
        sendToPlayer(remainingPlayerSock, JSON.stringify({
          type: 'gameEnded',
          reason: 'Opponent did not reconnect',
          winner: winner
        }));
      }
      
    }, RECONNECT_TIMEOUT);

    disconnected.set(gameId, {
      username: disconnectedPlayerUsername,
      time: Date.now(),
      timeout: timeout
    });
  }
}

async function updateAndEndGame(gameId, session, winner) {
  if (winner === 'player1') {
    session.score.player1 = 3;
    session.score.player2 = 0;
  } else {
    session.score.player1 = 0;
    session.score.player2 = 3;
  }
  
  const cleanSession = {
    player1username: session.player1username,
    player2username: session.player2username,
    score: session.score,
    createdAt: session.createdAt,
    gameType: session.gameType || 'classic',
  };

  try {
    const response = await fetch('http://localhost:3006/api/game/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: cleanSession,
        gameId,
      })
    });

    if (!response.ok) {
      console.error('Failed to update game:', await response.text());
    } else {
      console.log('Game updated successfully with walkover score.');
    }
  } catch (error) {
    console.error('Error updating game:', error);
  }

  stopGameLoop(gameId);
  sessions.delete(gameId);
  disconnected.delete(gameId);
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    activeGameLoops: gameLoops.size
  };
});

fastify.register(gameRoutes, { prefix: '/api/game' })

fastify.get('/stats', async (request, reply) => {
  const stats = {
    totalSessions: sessions.size,
    activeGames: [...sessions.values()].filter(s => s.gameStarted).length,
    pendingGames: [...sessions.values()].filter(s => !s.gameStarted).length,
    disconnectedPlayers: disconnected.size
  };
  return stats;
});

await fastify.listen({ port: 3006, host: '0.0.0.0' })
console.log('Pong server listening on port 3006')