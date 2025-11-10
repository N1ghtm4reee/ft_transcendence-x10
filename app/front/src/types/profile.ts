import { GameHistory, GameStats } from "./game";

export type ProfileOverview = {
	id: string;
	displayName: string;
	avatar: string;
	bio: string;
	status: "online" | "offline" | "In Game" | "in Tournament";
	rank: number | null;
	createdAt: string;
};

export interface Profile {
	profile: ProfileOverview;
	gameHistory: GameHistory[];
	gameStats: GameStats;
	achievements: string[];
	gamesH2h: GameHistory[];
	overallRecord?: {
		wins: number;
		losses: number;
	};
	isBlocked: boolean;
}
