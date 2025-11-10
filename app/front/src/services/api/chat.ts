import { stateManager } from "../../store/StateManager";
import { Conversation } from "../../types/message";
import { API_URL, WS_URL } from "./config";

export function initializeChatWebSocket() {
	const extractTokenFromCookies = (): string | null => {
		const cookies = document.cookie.split(";");
		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split("=");
			if (name === "token") {
				return value;
			}
		}
		return null;
	};

	const token = extractTokenFromCookies();
	if (!token) {
		console.error("No token found for chat WebSocket");
		return null;
	}

	const ws = new WebSocket(
		WS_URL + `/ws/chat/live?token=${encodeURIComponent(token)}`,
	);

	ws.onmessage = (event) => {
		const friends = (stateManager.getState("social") as any)?.friends || [];
		const currentUser = stateManager.getState("userProfile") as any | null;
		const data = JSON.parse(event.data);
		if (data.type === "new_message") {
			stateManager.emit("MESSAGE_RECEIVED", data);
		} else if (data.type === "CONVERSATION_ADDED") {
			const conversation: Conversation = {
				id: data.id,
				members: data.members.map(({ userId: m }: { userId: string }) => {
					if (currentUser && m === currentUser.id) {
						return {
							id: currentUser.id,
							displayName: currentUser.displayName,
							avatar: currentUser.avatar,
							status: "online" as const,
							rank: 0,
						};
					}
					const friend = friends.find((f: any) => f.id === m);
					return {
						id: m,
						displayName: friend?.displayName || `User ${m}`,
						avatar: friend?.avatar || "",
						status: friend?.status || "offline",
						rank: friend?.rank ?? 0,
					};
				}),
				messages: data.messages,
				unreadCount: data.unreadCount || 0,
				lastMessage: data.lastMessage || null,
			};
			stateManager.emit("CONVERSATION_ADDED", conversation);
		} else {
			console.log("Unknown websocket message type:", data.type);
		}
	};

	ws.onopen = () => {
		console.log("WebSocket connected");
	};

	ws.onclose = () => {
		console.log("WebSocket disconnected");
		setTimeout(() => {
			console.log("Reconnecting WebSocket...");
			initializeChatWebSocket();
		}, 5000);
	};

	ws.onerror = (error) => {
		console.error("WebSocket error:", error);
	};

	return ws;
}

export async function getOrCreateConversation(userId: string) {
	try {
		const response = await fetch(
			API_URL + `/api/chat/conversations/${userId}`,
			{
				method: "GET",
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to get or create conversation");
		}

		let conversation = await response.json();
		conversation = conversation.conversation;
		const friends = (stateManager.getState("social") as any)?.friends || [];
		const currentUser = stateManager.getState("userProfile") as any | null;
		conversation.members = conversation.members.map((m: any) => {
			if (currentUser && m === currentUser.id) {
				return {
					id: currentUser.id,
					displayName: currentUser.displayName,
					avatar: currentUser.avatar,
					status: "online" as const,
					rank: 0,
				};
			}
			const friend = friends.find((f: any) => f.id === m);
			return {
				id: m,
				displayName: friend?.displayName || `User ${m}`,
				avatar: friend?.avatar || "",
				status: friend?.status || "offline",
				rank: friend?.rank ?? 0,
			};
		});

		stateManager.emit("CONVERSATION_ADDED", conversation);
		return conversation;
	} catch (error) {
		console.error("Failed to get or create conversation:", error);
		return null;
	}
}

export async function getAllConversations() {
	try {
		const response = await fetch(API_URL + "/api/chat/conversations", {
			method: "GET",
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Failed to get conversations");
		}

		const data = await response.json();
		const friends = (stateManager.getState("social") as any)?.friends || [];
		const currentUser = stateManager.getState("userProfile") as any | null;

		const conversations: Conversation[] = data.conversations.map(
			(conversation: any) => ({
				id: conversation.id,
				members: conversation.members.map((m: any) => {
					if (currentUser && m === currentUser.id) {
						return {
							id: currentUser.id,
							displayName: currentUser.displayName,
							avatar: currentUser.avatar,
							status: "online" as const,
							rank: 0,
						};
					}
					const friend = friends.find((f: any) => f.id === m);
					return {
						id: m,
						displayName: friend?.displayName || `User ${m}`,
						avatar: friend?.avatar || "",
						status: friend?.status || "offline",
						rank: friend?.rank ?? 0,
					};
				}),
				messages: conversation.messages.map((msg: any) => ({
					id: msg.id,
					content: msg.content,
					senderId: msg.senderId,
					receiverId: msg.receiverId,
					createdAt: new Date(msg.createdAt),
				})),
				unreadCount: conversation.unreadCount || 0,
				lastMessage:
					conversation.messages.length > 0
						? {
								id: conversation.messages[conversation.messages.length - 1].id,
								content:
									conversation.messages[conversation.messages.length - 1]
										.content,
								senderId:
									conversation.messages[conversation.messages.length - 1]
										.senderId,
								receiverId:
									conversation.messages[conversation.messages.length - 1]
										.receiverId,
								createdAt: new Date(
									conversation.messages[conversation.messages.length - 1]
										.createdAt,
								),
							}
						: null,
			}),
		);
		stateManager.emit("CONVERSATIONS_LOADED", conversations);
		return conversations;
	} catch (error) {
		console.error("Failed to get conversations:", error);
		return [];
	}
}

export async function sendMessage(receiverId: string, content: string) {
	try {
		const response = await fetch(API_URL + "/api/chat/messages/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ receiverId, content }),
		});

		if (!response.ok) {
			throw new Error("Failed to send message");
		}

		const message = await response.json();
		return message;
	} catch (error) {
		console.error("Failed to send message:", error);
		throw error;
	}
}

export const formatTime = (date: Date) => {
	const now = new Date();
	const diffInMinutes = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60),
	);

	if (diffInMinutes < 1) return "now";
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
	if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
	return date.toLocaleDateString();
};
