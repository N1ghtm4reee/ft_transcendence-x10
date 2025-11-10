import type { ProfileOverview } from "./profile";

export interface Tournament {
	id: string;
	name: string;
	status: "upcoming" | "started" | "cancelled" | "completed";
	startDate: string;
	endDate: string;
	players: ProfileOverview[];
	playerCount: number;
	winnerId: string | null;
	createdBy: string;
}
