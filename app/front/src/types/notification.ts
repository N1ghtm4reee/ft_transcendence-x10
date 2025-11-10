import type { EventType, TournamentEvent } from "../store/StateManager.ts";
import type { GameHistory } from "./game";
import type { ProfileOverview } from "./profile";
import type { Tournament } from "./tournament";

export type FriendEvent =
	| "FRIEND_REQUEST_RECEIVED"
	| "FRIEND_REQUEST_ACCEPTED"
	| "FRIEND_REQUEST_DECLINED";

export type GameEvent =
	| "GAME_INVITE"
	| "GAME_ACCEPTED"
	| "GAME_FINISHED"
	| "GAME_REJECTED"
	| "TOURNAMENT_MATCH"
	| "TOURNAMENT_UPDATE";

export type Notification<T extends EventType> = {
	type: T;
	content: string;
	title: string;
	user: T extends "STATUS_UPDATE"
		? ProfileOverview & { isFriend: boolean; isOnline: boolean }
		: T extends FriendEvent | GameEvent
			? ProfileOverview
			: never;
	requestId: T extends "FRIEND_REQUEST_RECEIVED" ? number : never;
	gameId: T extends "GAME_INVITE" | "GAME_REJECTED" | "GAME_ACCEPTED"
		? string
		: never;
	matchId: T extends "TOURNAMENT_MATCH" ? string : never;
	tournamentId: T extends "TOURNAMENT_MATCH" | "TOURNAMENT_UPDATE"
		? string
		: never;
	tournamentName: T extends "TOURNAMENT_MATCH" | "TOURNAMENT_UPDATE"
		? string
		: never;
	opponent: T extends "TOURNAMENT_MATCH" ? ProfileOverview : never;
	round: T extends "TOURNAMENT_MATCH" ? number : never;
	gameResult: T extends "GAME_FINISHED" ? GameHistory : never;
	tournamentData: T extends TournamentEvent ? Tournament : never;
};

export function isNotificationType<T extends EventType>(
	data: any,
	type: T,
): data is Notification<T> {
	return data && data.type === type;
}
