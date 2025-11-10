export interface GameUpdate {
	type:
		| "gameUpdate"
		| "gameEnd"
		| "scoreUpdate"
		| "reconnection"
		| "connected"
		| "gamePaused"
		| "gameResumed"
		| "playerDisconnected";
	gameId: string;
	gameBoard: GameBoard;
	score: Score;
	gameStarted: boolean;
	playerNumber?: number;
	opponent?: string;
	isPaused?: boolean;
	pauseReason?: string;
	reason?: string;
	message?: string;
	disconnectedPlayer?: string;
}

export interface GameBoard {
	player1: Player;
	player2: Player;
	ball: Ball;
}

export interface Player {
	paddleY: number;
}

export interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export interface Score {
	player1: number;
	player2: number;
}
