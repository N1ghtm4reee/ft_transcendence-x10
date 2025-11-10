import type { ProfileOverview } from "./profile";
export type GameHistory = {
	id: number;
	playedAt: string;
	result: "win" | "loss" | "draw";
	playerScore: number;
	opponentScore: number;
	opponent: ProfileOverview;
	opponentName: string;
};

export type GameStats = {
	totalGames: number;
	wins: number;
	losses: number;
	tournaments: number;
	tournamentWins: number;
	bestStreak: number;
	currentStreak: number;
};
