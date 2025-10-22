# 3-Second Timeout Forfeit System Implementation

## Overview

Implemented a 3-second timeout system where players who disconnect during a game lose by forfeit after a 3-second grace period. This replaces the previous immediate draw system.

## How It Works

### When a Player Disconnects:

1. **Game Pauses Immediately**: The game stops and enters "paused" state
2. **3-Second Countdown**: The system waits exactly 3 seconds for reconnection
3. **Forfeit After Timeout**: If the player doesn't reconnect, they lose by forfeit
4. **Winner Declared**: The remaining connected player automatically wins

### User Experience Flow:

1. **Player Disconnects**: Game pauses, remaining player sees "Opponent disconnected. Waiting 3 seconds for reconnection..."
2. **During Timeout**: Game remains in paused state for exactly 3 seconds
3. **After Timeout**: If no reconnection, remaining player sees "Opponent disconnected. You win by forfeit!"
4. **Victory Screen**: Standard win/loss screen is displayed with appropriate messaging

## Technical Implementation

### Backend Changes (`/services/game/src/server.js`):

1. **Modified `handlePlayerDisconnection()`**:

   - Pauses game immediately using `pauseGame(gameId, "disconnection")`
   - Sends initial disconnection message with `timeoutSeconds: 3`
   - Sets up 3-second timeout using `setTimeout()`
   - After timeout, declares winner and calls `updateAndEndGame()`

2. **Removed Draw System**:

   - Deleted `updateAndEndGameDraw()` function entirely
   - Reverted to winner/loser system using existing `updateAndEndGame()`

3. **WebSocket Messages**:
   - **Initial disconnection**: `{ type: "playerDisconnected", message: "Opponent disconnected. Waiting 3 seconds...", timeoutSeconds: 3 }`
   - **After timeout**: `{ type: "playerDisconnected", message: "Opponent disconnected. You win by forfeit!", winner: playerId }`

### Frontend Changes (`/transcendance/src/pages/game/index.tsx`):

1. **Updated `playerDisconnected` Handler**:

   - Checks for `message.timeoutSeconds` to detect initial disconnection (shows pause)
   - Checks for `message.winner` to detect final result after timeout (shows victory/defeat)

2. **Removed Draw Support**:

   - Updated `matchResults` type from `"win" | "loss" | "draw"` to `"win" | "loss"`
   - Removed all draw-related UI rendering (🤝 emoji, yellow colors, etc.)
   - Simplified victory screen to only show win/loss states

3. **Game State Management**:
   - **Initial disconnection**: Sets game to "paused" state with disconnection reason
   - **After timeout**: Sets game to "finished" state with appropriate win/loss result

### Type Definitions (`/transcendance/src/types/user.ts`):

- Updated `GameHistory.result` from `"win" | "loss" | "draw"` to `"win" | "loss"`

## Key Benefits

1. **Fair Competition**: 3-second grace period allows for brief connection issues
2. **Clear Resolution**: Disconnection = automatic forfeit loss (no draws)
3. **Quick Resolution**: Only 3 seconds of waiting, then immediate result
4. **Better UX**: Clear messaging about what's happening during timeout
5. **Consistent Outcomes**: Always produces a winner and loser

## Testing the System

To test the 3-second timeout forfeit system:

1. Start a game between two players
2. Disconnect one player (close browser/tab)
3. Remaining player should see "Waiting 3 seconds for reconnection..." message
4. After exactly 3 seconds, remaining player should see victory screen
5. Database should record the win/loss with appropriate scores

## Message Flow

```
Player Disconnects
        ↓
Game Pauses Immediately
        ↓
Send "Waiting 3 seconds..." message
        ↓
Start 3-second timeout
        ↓
After 3 seconds (if no reconnection)
        ↓
Declare winner, send "You win by forfeit!" message
        ↓
Show victory/defeat screen
        ↓
Update database with win/loss result
```

The system ensures fair play while preventing draws - every disconnection results in a clear winner and loser after a reasonable grace period.
