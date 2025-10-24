# Game Service

A real-time Pong game service built with Fastify and WebSockets that handles multiplayer game sessions, player connections, and game state management.

## How It Works

The game service manages Pong games between two players using a combination of HTTP endpoints for game management and WebSocket connections for real-time gameplay.

### Game Flow

1. **Game Invitation**: Player 1 challenges Player 2 using the challenge endpoint
2. **Invitation Response**: Player 2 can accept or reject the invitation
3. **WebSocket Connection**: Both players connect via WebSocket for real-time communication
4. **Game Session**: The game starts when both players are connected
5. **Real-time Updates**: Ball movement, paddle positions, and scores are synchronized
6. **Game End**: Game ends when a player reaches the winning score or disconnects

### Complete Game Flow with Endpoints and WebSocket Usage

#### Phase 1: Game Invitation

1. **Player 1 creates challenge**
   - `POST /api/game/challenge?opponentId=player2&mode=classic`
   - Creates game session in memory
   - Sends notification to Player 2 via notification service
   - Returns gameId to Player 1

#### Phase 2: WebSocket Connections (Can happen before or after invitation)

2. **Players connect to WebSocket**
   - Player 1: `GET /ws/game?playerId=player1`
   - Player 2: `GET /ws/game?playerId=player2`
   - Server sends `"connected"` message to each player
   - If game session exists, players are automatically assigned to it

#### Phase 3: Invitation Response

3. **Player 2 responds to invitation**
   - **Accept**: `POST /api/game/accepted/:gameId`
     - Sends notifications to both players
     - If both players already connected via WebSocket, game starts immediately
   - **Reject**: `POST /api/game/reject/:gameId`
     - Sends notification to Player 1
     - Cleans up game session
     - Process ends here if rejected

#### Phase 4: Game Initialization (if accepted)

4. **WebSocket messages after acceptance**
   - Server sends `"gameCreated"` to both players with:
     - gameId
     - playerNumber (1 or 2)
     - opponent info
     - initial game board state
     - scores (0-0)
   - If both players connected: `waitingForOpponent: false`
   - If one missing: `waitingForOpponent: true`

#### Phase 5: Game Start

5. **When both players are connected**
   - Game loop starts (60 FPS)
   - Server sends `"gameUpdate"` messages continuously with:
     - Ball position (x, y, vx, vy)
     - Paddle positions
     - Current scores
     - Game status

#### Phase 6: Active Gameplay

6. **Real-time WebSocket communication**

   **Client to Server:**

   - `"move"` messages: `{type: "move", direction: "up|down"}`
   - `"paddlePosition"` messages: `{type: "paddlePosition", y: 5.0}`
   - `"stop"` messages: `{type: "stop"}`

   **Server to Client:**

   - `"gameUpdate"` (60 FPS): Current game state
   - `"scoreUpdate"`: When someone scores
   - `"gamePaused"`: If player disconnects
   - `"gameResumed"`: When disconnected player returns

#### Phase 7: Disconnection Handling (if occurs)

7. **Player disconnects during game**

   - Game pauses automatically
   - Server sends `"gamePaused"` to remaining player
   - 30-second timeout starts
   - Remaining player sees countdown message

8. **Reconnection attempt**

   - Disconnected player reconnects: `GET /ws/game?playerId=playerX&gameId=gameId`
   - Server sends `"reconnection"` message with current game state
   - Server sends `"gameResumed"` to both players
   - Game loop resumes

9. **Timeout reached (if no reconnection)**
   - Game ends with remaining player as winner
   - Server sends final `"playerDisconnected"` message
   - Game session cleaned up

#### Phase 8: Game Completion

10. **Normal game end** (someone reaches winning score)
    - Game loop stops
    - Server sends `"gameEnd"` message with:
      - Winner ID
      - Final scores
      - Game ID
    - Updates sent to external services:
      - User management (statistics/achievements)
      - Tournament service (if tournament mode)
      - Notification service (game results)
    - Game session deleted from memory

#### Phase 9: Monitoring (Available anytime)

11. **Administrative endpoints**
    - `GET /health`: Service status and connection counts
    - `GET /stats`: Detailed game statistics
    - `GET /api/game/:gameId`: Specific game session info

#### Key Timing Notes:

- **WebSocket connections can happen at any time** - before invitation, after acceptance, or during reconnection
- **HTTP endpoints handle game lifecycle** - create, accept, reject, query
- **WebSocket handles real-time gameplay** - movements, updates, state sync
- **Game starts only when both conditions met**: invitation accepted AND both players connected via WebSocket
- **Reconnection uses same WebSocket endpoint** but with gameId parameter
- **30-second rule**: Players have 30 seconds to reconnect before losing by forfeit

### Key Components

- **Game Sessions**: In-memory storage of active games with player information and game state
- **WebSocket Connections**: Real-time communication for paddle movements and game updates
- **Game Loop**: 60 FPS game loop that updates ball physics and handles collisions
- **Reconnection System**: 30-second timeout for players to reconnect if disconnected
- **Notifications**: Integration with notification service for game invites and results

## API Endpoints

### Game Management

#### `POST /api/game/challenge`

Create a new game challenge between two players.

**Query Parameters:**

- `opponentId`: ID of the player to challenge
- `mode`: Game mode (`classic` or `tournament`, default: `classic`)
- `matchId`: Tournament match ID (optional, for tournament games)

**Headers:**

- `x-user-id`: ID of the challenging player

**Response:**

```json
{
  "success": true,
  "gameId": "uuid",
  "message": "Game created successfully",
  "playersConnected": {
    "player1": true,
    "player2": false
  }
}
```

#### `POST /api/game/accepted/:gameId`

Accept a game invitation.

**Parameters:**

- `gameId`: ID of the game to accept

**Headers:**

- `x-user-id`: ID of the accepting player

#### `POST /api/game/reject/:gameId`

Reject a game invitation.

**Parameters:**

- `gameId`: ID of the game to reject

#### `GET /api/game/:gameId`

Get information about a specific game session.

**Parameters:**

- `gameId`: ID of the game

**Response:**

```json
{
  "gameId": "uuid",
  "playerId1": "player1_id",
  "playerId2": "player2_id",
  "mode": "classic",
  "score": {
    "player1": 0,
    "player2": 0
  },
  "gameStarted": true,
  "waitingForPlayers": false,
  "playersConnected": {
    "player1": true,
    "player2": true
  },
  "createdAt": 1635123456789
}
```

### Monitoring

#### `GET /health`

Health check endpoint for monitoring service status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-10-24T10:30:00.000Z",
  "activeSessions": 5,
  "activeGameLoops": 3,
  "connectedPlayers": 8
}
```

#### `GET /stats`

Detailed statistics about the service.

**Response:**

```json
{
  "totalSessions": 10,
  "activeGames": 3,
  "pendingGames": 2,
  "disconnectedPlayers": 1,
  "connectedPlayers": 8
}
```

## WebSocket Connection

### `GET /ws/game`

WebSocket endpoint for real-time game communication.

**Query Parameters:**

- `playerId`: ID of the connecting player (required)
- `gameId`: ID of existing game for reconnection (optional)

### WebSocket Message Types

#### Client to Server

**Move Paddle:**

```json
{
  "type": "move",
  "direction": "up" | "down"
}
```

**Set Paddle Position:**

```json
{
  "type": "paddlePosition",
  "y": 5.0
}
```

**Stop Movement:**

```json
{
  "type": "stop"
}
```

#### Server to Client

**Connection Confirmation:**

```json
{
  "type": "connected",
  "playerId": "player_id",
  "message": "Connected successfully"
}
```

**Game Created:**

```json
{
  "type": "gameCreated",
  "gameId": "uuid",
  "playerNumber": 1,
  "opponent": "opponent_id",
  "mode": "classic",
  "gameBoard": { ... },
  "score": { "player1": 0, "player2": 0 },
  "waitingForOpponent": false
}
```

**Game Update:**

```json
{
  "type": "gameUpdate",
  "gameId": "uuid",
  "gameBoard": {
    "player1": { "paddleY": 5.0 },
    "player2": { "paddleY": 5.0 },
    "ball": { "x": 10.0, "y": 5.0, "vx": 0.15, "vy": 0.1 }
  },
  "score": { "player1": 1, "player2": 0 },
  "gameStarted": true
}
```

**Score Update:**

```json
{
  "type": "scoreUpdate",
  "score": { "player1": 2, "player2": 1 }
}
```

**Game End:**

```json
{
  "type": "gameEnd",
  "winner": "player_id",
  "finalScore": { "player1": 5, "player2": 3 },
  "gameId": "uuid"
}
```

**Game Paused:**

```json
{
  "type": "gamePaused",
  "reason": "disconnection",
  "message": "Game paused - waiting for player to reconnect..."
}
```

**Game Resumed:**

```json
{
  "type": "gameResumed",
  "message": "Game resumed!",
  "gameBoard": { ... },
  "score": { ... }
}
```

**Reconnection:**

```json
{
  "type": "reconnection",
  "gameId": "uuid",
  "playerNumber": 1,
  "opponent": "opponent_id",
  "gameBoard": { ... },
  "score": { ... },
  "mode": "classic",
  "isPaused": false,
  "pauseReason": null
}
```

## Game Configuration

- **Game Dimensions**: 20x10 units
- **Ball Speed**: 0.15 units per frame
- **Paddle Height**: 2 units
- **Paddle Speed**: 0.5 units per frame
- **Winning Score**: 5 points (classic), 3 points (tournament)
- **Game Loop**: 60 FPS
- **Reconnection Timeout**: 30 seconds
- **Session Cleanup**: 30 minutes for inactive sessions

## Dependencies

- Fastify: Web framework
- @fastify/websocket: WebSocket support
- @fastify/cors: CORS handling
- @prisma/client: Database integration
- crypto: UUID generation for game IDs

## External Services

- **Notification Service** (port 3005): Sends game invitations and results
- **User Management Service** (port 3006): Updates game statistics and achievements
- **Tournament Service** (port 3007): Reports tournament match results

## Error Handling

- Player validation and blocking checks
- Duplicate game prevention
- WebSocket connection management
- Automatic cleanup of expired sessions
- Graceful handling of player disconnections
