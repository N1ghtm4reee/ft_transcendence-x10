import type { ProfileOverview } from "./profile";
export type Message = {
	id: string;
	senderId: string;
	content: string;
	receiverId: string;
	createdAt: Date;
	convoId: string;
};

export type Conversation = {
	id: string;
	members: ProfileOverview[];
	messages: Message[];
	unreadCount: number;
	lastMessage: Message | null;
};
