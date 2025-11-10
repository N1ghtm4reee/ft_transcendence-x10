import type { Achievement } from "../../../types/achievement";
export interface ProfileUser {
	id: string;
	avatar: string;
	name: string;
	username: string;
	rank: number | null;
	level: number;
	wins: number;
	losses: number;
	winRate: number;
	winStreak: number;
	currentStreak: number;
	bestStreak: number;
	joinDate: string;
	totalMatches: number;
	tournamentsWon: number;
	overallRecord: {
		wins: number;
		losses: number;
	};
	xp: number;
}

export interface Match {
	id: number;
	opponent: string;
	result: "win" | "loss";
	score: string;
	time: string;
}

export type UserAchievement = Achievement & {
	unlocked: boolean;
	name: string;
};

export interface MutualMatch {
	id: number;
	result: "win" | "loss";
	score: string;
	date: string;
}

export interface Tab {
	id: string;
	label: string;
	icon: string;
}
