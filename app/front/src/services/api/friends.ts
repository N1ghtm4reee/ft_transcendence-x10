import { stateManager } from "../../store/StateManager";
import { API_URL } from "./config";

export async function sendFriendRequest(userId: string, username: string) {
	try {
		const tempRequest = {
			user: {
				id: userId,
				displayName: username,
				avatar: "",
				status: "online" as const,
				lastActive: new Date(),
			},
			createdAt: new Date(),
		};

		stateManager.emit("FRIEND_REQUEST_SENT", tempRequest);

		const response = await fetch(API_URL + "/api/user-management/friendships", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ receiverId: userId }),
		});

		if (!response.ok) {
			stateManager.updateState("social", (prev: any) => ({
				...prev,
				friendRequests: {
					...prev.friendRequests,
					sent: prev.friendRequests.sent.filter(
						(req: any) => req.user.id !== userId,
					),
				},
			}));
			throw new Error("Failed to send friend request");
		}

		return true;
	} catch (error) {
		console.error("Failed to send friend request:", error);
		return false;
	}
}

export async function acceptFriendRequest(requestId: string, user: any) {
	try {
		const response = await fetch(
			API_URL + `/api/user-management/friendships/${requestId}`,
			{
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "accepted" }),
			},
		);

		if (response.ok) {
			stateManager.emit("FRIEND_REQUEST_ACCEPTED", { requestId, user });
			return true;
		} else {
			throw new Error("Failed to accept friend request");
		}
	} catch (error) {
		console.error("Failed to accept friend request:", error);
		return false;
	}
}

export async function declineFriendRequest(requestId: string, friend: any) {
	try {
		const response = await fetch(
			API_URL + `/api/user-management/friendships/${requestId}`,
			{
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "declined" }),
			},
		);

		if (response.ok) {
			stateManager.emit("FRIEND_REQUEST_DECLINED", { requestId, friend });
			return true;
		} else {
			throw new Error("Failed to decline friend request");
		}
	} catch (error) {
		console.error("Failed to decline friend request:", error);
		return false;
	}
}

export async function removeFriend(userId: string) {
	try {
		const response = await fetch(
			API_URL + `/api/user-management/friendships/${userId}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to remove friend");
		}

		stateManager.emit("FRIEND_REMOVED", { user: { id: userId } });
		return true;
	} catch (error) {
		console.error("Failed to remove friend:", error);
		return false;
	}
}

export async function blockUser(id: string) {
	try {
		const response = await fetch(API_URL + "/api/user-management/blocks/", {
			method: "POST",
			body: JSON.stringify({
				blockedUserId: id,
			}),
			headers: {
				"content-type": "application/json",
			},
			credentials: "include",
		});
		if (!response.ok) {
			const reason = await response.json();
			return { error: reason.message, success: false };
		}
		return { success: true } as const;
	} catch (error) {
		return { error: error, success: false };
	}
}

export async function unblockUser(id: string) {
	try {
		const response = await fetch(
			API_URL + "/api/user-management/blocks/" + id,
			{
				method: "DELETE",
				credentials: "include",
			},
		);
		if (!response.ok) {
			const reason = await response.json();
			return { error: reason.message, success: false };
		}
		return { success: true } as const;
	} catch (error) {
		return { error: error, success: false };
	}
}
