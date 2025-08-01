import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import url from 'url'
import gameRoutes from './routes/game.routes.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const fastify = Fastify()
await fastify.register(websocket)

const sessions = {};
const gameLoops = {};
let gameId = 0;

// Game constants
const GAME_WIDTH = 20;
const GAME_HEIGHT = 10;
const BALL_SPEED = 0.15;
const PADDLE_HEIGHT = 2;
const PADDLE_SPEED = 0.5;
const RECONNECT_TIMEOUT = 30000; // 30 seconds

// Initialize first game session
sessions[gameId] = createGameSession();

const disconnected = {};

disconnected[gameId] = {
  count: 0,
  gameId: gameId,
  username: null,
  time: null,
  timeout: null,
}

function createGameSession() {
  return {
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
}

function startGameLoop(gameId) {
  if (gameLoops[gameId]) return; // Already running

  console.log(`Starting game loop for game ${gameId}`);
  
  gameLoops[gameId] = setInterval(() => {
    const session = sessions[gameId];
    if (!session || !session.gameStarted) {
      return;
    }

    // Check if both players are still connected
    const p1Connected = session.player1Sock && session.player1Sock.readyState === 1;
    const p2Connected = session.player2Sock && session.player2Sock.readyState === 1;
    
    if (!p1Connected || !p2Connected) {
      pauseGame(gameId);
      return;
    }

    updateBall(session, gameId);
    broadcastGameState(gameId);
  }, 1000 / 60); // 60 FPS
}

function pauseGame(gameId) {
  const session = sessions[gameId];
  if (session) {
    session.gameStarted = false;
    console.log(`Game ${gameId} paused due to player disconnection`);
  }
}

function stopGameLoop(gameId) {
  if (gameLoops[gameId]) {
    clearInterval(gameLoops[gameId]);
    delete gameLoops[gameId];
    console.log(`Game loop stopped for game ${gameId}`);
  }
}

async function updateBall(session, gameId) {
  const ball = session.gameBoard.ball;

  // Update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Ball collision with top/bottom walls
  if (ball.y <= 0 || ball.y >= GAME_HEIGHT) {
    ball.vy = -ball.vy;
    ball.y = Math.max(0, Math.min(GAME_HEIGHT, ball.y));
    
    // Add slight randomization to prevent infinite bouncing
    ball.vy += (Math.random() - 0.5) * 0.01;
  }

  // Ball collision with paddles
  const paddleWidth = 0.5;

  // Left paddle (Player 1)
  if (ball.x <= paddleWidth && ball.vx < 0) {
    const p1Y = session.gameBoard.player1.paddleY;
    if (ball.y >= p1Y - PADDLE_HEIGHT / 2 && ball.y <= p1Y + PADDLE_HEIGHT / 2) {
      ball.vx = -ball.vx;
      ball.x = paddleWidth;
      // Add angle variation based on paddle hit position
      const hitPos = (ball.y - p1Y) / (PADDLE_HEIGHT / 2);
      ball.vy += hitPos * 0.05;
      
      // Increase speed slightly on paddle hits
      const speedMultiplier = 1.02;
      ball.vx *= speedMultiplier;
      ball.vy *= speedMultiplier;
    }
  }

  // Right paddle (Player 2)
  if (ball.x >= GAME_WIDTH - paddleWidth && ball.vx > 0) {
    const p2Y = session.gameBoard.player2.paddleY;
    if (ball.y >= p2Y - PADDLE_HEIGHT / 2 && ball.y <= p2Y + PADDLE_HEIGHT / 2) {
      ball.vx = -ball.vx;
      ball.x = GAME_WIDTH - paddleWidth;
      // Add angle variation
      const hitPos = (ball.y - p2Y) / (PADDLE_HEIGHT / 2);
      ball.vy += hitPos * 0.05;
      
      // Increase speed slightly on paddle hits
      const speedMultiplier = 1.02;
      ball.vx *= speedMultiplier;
      ball.vy *= speedMultiplier;
    }
  }

  // Ball out of bounds - scoring
  if (ball.x < 0) {
    session.score.player2++;
    resetBall(session);
    broadcastScoreUpdate(session);
  } else if (ball.x > GAME_WIDTH) {
    session.score.player1++;
    resetBall(session);
    broadcastScoreUpdate(session);
  }

  // end game if 5 goals reached and update database
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
    console.log(cleanSession);
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


  // Limit ball velocity to prevent it from becoming too fast
  const maxSpeed = 0.4;
  if (Math.abs(ball.vx) > maxSpeed) ball.vx = maxSpeed * Math.sign(ball.vx);
  if (Math.abs(ball.vy) > maxSpeed) ball.vy = maxSpeed * Math.sign(ball.vy);
  
  // Ensure minimum speed to prevent ball from getting stuck
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
  const session = sessions[gameId];
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

function broadcastScoreUpdate(session) {
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
  for (const gID in disconnected) {
    const dis = disconnected[gID];

    if (dis.username === username) {
      // Reconnection detected
      clearTimeout(dis.timeout);
      delete disconnected[gID];

      console.log(`${username} reconnected to game ${gID}`);
      console.log(`Score: ${sessions[gID].score.player1} - ${sessions[gID].score.player2}`);

      // Reassign socket to the session
      const session = sessions[gID];
      if (!session) continue;

      connection.gameId = parseInt(gID);
      
      // Determine which player is reconnecting
      if (session.player1username === username) {
        session.player1Sock = connection;
        connection.send(JSON.stringify({
          type: 'reconnection',
          gameId: parseInt(gID),
          playerNumber: 1,
          gameBoard: session.gameBoard,
          score: session.score
        }));
      } else if (session.player2username === username) {
        session.player2Sock = connection;
        connection.send(JSON.stringify({
          type: 'reconnection',
          gameId: parseInt(gID),
          playerNumber: 2,
          gameBoard: session.gameBoard,
          score: session.score
        }));
      }

      // Resume game if both players are connected
      const p1Connected = session.player1Sock && session.player1Sock.readyState === 1;
      const p2Connected = session.player2Sock && session.player2Sock.readyState === 1;
      
      if (p1Connected && p2Connected) {
        session.gameStarted = true;
        startGameLoop(parseInt(gID));
      }
      
      return true;
    }
  }
  return false;
}

function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 1800000; // 30 minutes
  
  for (const id in sessions) {
    const session = sessions[id];
    if (session.createdAt && now - session.createdAt > maxAge) {
      if (!session.player1Sock && !session.player2Sock) {
        stopGameLoop(id);
        delete sessions[id];
        console.log(`Cleaned up old session ${id}`);
      }
    }
  }
}

// Clean up old sessions every 5 minutes
setInterval(cleanupOldSessions, 300000);

fastify.get('/game', { websocket: true }, (connection, req) => {
  const Url = url.parse(req.url, true);
  const queryparams = Url.query;
  let username = queryparams.username;
  
  if (!username) {
    connection.close(1008, 'Username required');
    return;
  }
  
  let currentGameId = gameId;
  connection.username = username;

  // Check if reconnection
  if (handleReconnection(connection, username)) {
    return;
  }

  // Find or create game session
  if (!sessions[currentGameId]) {
    sessions[currentGameId] = createGameSession();
  }

  connection.gameId = currentGameId;

  if (!sessions[currentGameId].player1Sock) {
    sessions[currentGameId].player1Sock = connection;
    sessions[currentGameId].player1username = username;
    console.log(`Game ${currentGameId}: Player 1 (${username}) joined`);
    
    connection.send(JSON.stringify({
      type: 'playerAssignment',
      gameId: currentGameId,
      playerNumber: 1,
      gameBoard: sessions[currentGameId].gameBoard,
      score: sessions[currentGameId].score,
      waitingForPlayer: true
    }));
  }
  else if (!sessions[currentGameId].player2Sock) {
    sessions[currentGameId].player2Sock = connection;
    sessions[currentGameId].player2username = username;
    console.log(`Game ${currentGameId}: Player 2 (${username}) joined`);
    
    connection.send(JSON.stringify({
      type: 'playerAssignment',
      gameId: currentGameId,
      playerNumber: 2,
      gameBoard: sessions[currentGameId].gameBoard,
      score: sessions[currentGameId].score,
      waitingForPlayer: false
    }));

    // Notify player 1 that player 2 joined
    sendToPlayer(sessions[currentGameId].player1Sock, JSON.stringify({
      type: 'playerJoined',
      waitingForPlayer: false
    }));

    // Start the game when both players are connected
    sessions[currentGameId].gameStarted = true;
    startGameLoop(currentGameId);
    console.log(`Game ${currentGameId} started!`);

    // Create new game session for next players
    gameId++;
    sessions[gameId] = createGameSession();
    disconnected[gameId] = {
      count: 0,
      gameId: gameId,
      username: null,
      time: null,
      timeout: null,
    };
  } else {
    // Game is full
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
        const session = sessions[message.gameId];
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
            newY = Math.min(GAME_HEIGHT - PADDLE_HEIGHT / 2, currentY + PADDLE_SPEED);
          } else if (message.direction === 'down') {
            newY = Math.max(PADDLE_HEIGHT / 2, currentY - PADDLE_SPEED);
          }

          session.gameBoard[player].paddleY = newY;

          // Broadcast paddle movement immediately
          if (!session.gameStarted) {
            broadcastGameState(message.gameId);
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
  
  if (!gameId || !sessions[gameId]) return;
  
  const session = sessions[gameId];
  let disconnectedPlayer = null;

  if (session.player1Sock === connection) {
    session.player1Sock = null;
    disconnectedPlayer = 'player1';
    console.log(`Player 1 (${username}) disconnected from game ${gameId}`);
  } else if (session.player2Sock === connection) {
    session.player2Sock = null;
    disconnectedPlayer = 'player2';
    console.log(`Player 2 (${username}) disconnected from game ${gameId}`);
  }

  if (disconnectedPlayer) {
    pauseGame(gameId);
    
    // Notify remaining player
    const remainingSocket = disconnectedPlayer === 'player1' ? session.player2Sock : session.player1Sock;
    sendToPlayer(remainingSocket, JSON.stringify({
      type: 'playerDisconnected',
      message: 'Opponent disconnected. Waiting for reconnection...'
    }));

    // Handle disconnection tracking
    if (!disconnected[gameId] || disconnected[gameId].count === 0) {
      disconnected[gameId] = {
        count: 1,
        gameId: gameId,
        username: username,
        time: Date.now(),
        timeout: setTimeout(() => {
          console.log(`${username} did not reconnect in time. Ending game ${gameId}.`);
          
          // Notify remaining player and close game
          const session = sessions[gameId];
          if (session) {
            const remainingSocket = disconnectedPlayer === 'player1' ? session.player2Sock : session.player1Sock;
            sendToPlayer(remainingSocket, JSON.stringify({
              type: 'gameEnded',
              reason: 'Opponent did not reconnect',
              winner: disconnectedPlayer === 'player1' ? 'player2' : 'player1'
            }));
          }
          
          stopGameLoop(gameId);
          delete sessions[gameId];
          delete disconnected[gameId];
        }, RECONNECT_TIMEOUT)
      };
    } else if (disconnected[gameId].username !== username) {
      // Both players disconnected
      console.log(`Both players disconnected from game ${gameId}. Ending game.`);
      clearTimeout(disconnected[gameId].timeout);
      stopGameLoop(gameId);
      delete sessions[gameId];
      delete disconnected[gameId];
    }
  }
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeSessions: Object.keys(sessions).length,
    activeGameLoops: Object.keys(gameLoops).length
  };
});

fastify.register(gameRoutes, { prefix: '/api/game' })

// Game stats endpoint
fastify.get('/stats', async (request, reply) => {
  const stats = {
    totalSessions: Object.keys(sessions).length,
    activeGames: Object.values(sessions).filter(s => s.gameStarted).length,
    pendingGames: Object.values(sessions).filter(s => !s.gameStarted).length,
    disconnectedPlayers: Object.keys(disconnected).length
  };
  return stats;
});

await fastify.listen({ port: 3006, host: '0.0.0.0' })
console.log('Pong server listening on port 3006')