import type { ProfileOverview } from "./profile";

export type FriendRequest = {
	user: Friend;
	id: string;
	createdAt: Date;
};

export type Friend = ProfileOverview & { lastActive: Date };
