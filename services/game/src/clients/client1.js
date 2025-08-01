const WebSocket = require('ws');
const readline = require('readline');

const ws = new WebSocket('ws://localhost:4000/game');
let gameId = null;
let playerNumber = null;

ws.on('open', () => {
  console.log('WebSocket connection opened');
  console.log('Waiting for game assignment...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received:', message);
    
    if (message.gameId !== undefined) {
      gameId = message.gameId;
    }
    
    if (message.playerNumber) {
      playerNumber = message.playerNumber;
      console.log(`You are Player ${playerNumber}`);
      console.log('Press "w" for up, "s" for down, Ctrl+C to exit');
      
      // Set up input handling only after game assignment
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      
      process.stdin.on('keypress', (str, key) => {
        if (gameId === null) return;
        
        if (key.name === 'w') {
          ws.send(JSON.stringify({ 
            type: 'move', 
            direction: 'up', 
            gameId: gameId 
          }));
        } else if (key.name === 's') {
          ws.send(JSON.stringify({ 
            type: 'move', 
            direction: 'down', 
            gameId: gameId 
          }));
        } else if (key.ctrl && key.name === 'c') {
          process.exit();
        }
      });
    }
    
    if (message.gameBoard) {
      console.log('Game Board:');
      console.log(`Player 1 paddle Y: ${message.gameBoard.player1.paddleY}`);
      console.log(`Player 2 paddle Y: ${message.gameBoard.player2.paddleY}`);
    }
    
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit();
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});