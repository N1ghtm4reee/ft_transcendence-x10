import type { Friend, FriendRequest } from "./friend";
import type { GameHistory, GameStats } from "./game";
import type { ProfileOverview } from "./profile";

export type User = {
	profile: ProfileOverview;
	gameHistory: GameHistory[];
	gameStats: GameStats;
	achievements: string[];
	friends: Friend[];
	friendRequests: {
		sent: FriendRequest[];
		received: FriendRequest[];
	};
};
