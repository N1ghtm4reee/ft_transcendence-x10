import { redirect } from "Miku/Router";
import { useNotifications } from "../../pages/use-notification";
import { stateManager } from "../../store/StateManager";
import { isNotificationType } from "../../types/notification";
import { API_URL, WS_URL } from "./config";
import { acceptChallenge, rejectChallenge } from "./game";
import { sendTournamentChallenge } from "./tournament";

export function initializeNotificationWs() {
	const { addNotification } = useNotifications();

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
		console.error("No token found for notification WebSocket");
		return null;
	}

	const ws = new WebSocket(
		WS_URL + `/ws/notifications/live?token=${encodeURIComponent(token)}`,
	);

	ws.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			if (data.type === "connection_status") {
				return;
			}

			if (isNotificationType(data, "FRIEND_REQUEST_RECEIVED")) {
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "info",
					message: data.content,
				});
				stateManager.emit("FRIEND_REQUEST_RECEIVED", {
					user: data.user,
					id: data.requestId,
				});
			} else if (isNotificationType(data, "FRIEND_REQUEST_ACCEPTED")) {
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "info",
					message: data.content,
				});
				stateManager.emit("FRIEND_REQUEST_ACCEPTED", { user: data.user });
			} else if (isNotificationType(data, "FRIEND_REQUEST_DECLINED")) {
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "info",
					message: data.content,
				});
				stateManager.emit("FRIEND_REQUEST_DECLINED", { user: data.user });
			} else if (isNotificationType(data, "STATUS_UPDATE")) {
				stateManager.emit("STATUS_UPDATE", { user: data.user });
			} else if (isNotificationType(data, "FRIEND_REMOVED")) {
				stateManager.emit("FRIEND_REMOVED", { user: data.user });
			} else if (isNotificationType(data, "GAME_INVITE")) {
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "game_invite",
					message: data.content,
					onAccept: () => {
						acceptChallenge(data.gameId).then(() => {
							console.log("Game invite accepted", data.gameId);
						});
					},
					onReject: () => {
						rejectChallenge(data.gameId).then(() => {
							console.log("Game invite rejected", data.gameId);
						});
					},
				});
			} else if (isNotificationType(data, "TOURNAMENT_MATCH")) {
				addNotification({
					title: data.title,
					avatar: data.opponent.avatar,
					type: "tournament_match",
					message: data.content,
					onAccept: () => {
						sendTournamentChallenge(data.matchId, data.opponent.id).then(() => {
							console.log("Tournament match accepted", data.matchId);
						});
					},
					onReject: () => {
						redirect("/tournaments");
					},
				});
			} else if (isNotificationType(data, "TOURNAMENT_UPDATED")) {
				addNotification({
					title: data.title,
					type: "info",
					message: data.content,
					onView: () => redirect("/tournaments"),
				});
			} else if (isNotificationType(data, "GAME_ACCEPTED")) {
				redirect("/game/" + data.gameId);
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "info",
					message: data.content,
				});
			} else if (isNotificationType(data, "GAME_REJECTED")) {
				addNotification({
					title: data.title,
					avatar: data.user.avatar,
					type: "info",
					message: data.content,
				});
			} else if (isNotificationType(data, "ACHIEVEMENT_UNLOCKED")) {
				stateManager.emit("ACHIEVEMENT_UNLOCKED", data);
			} else if (isNotificationType(data, "GAME_FINISHED")) {
				stateManager.emit("GAME_FINISHED", data.gameResult);
			} else if (isNotificationType(data, "TOURNAMENT_LEFT")) {
				stateManager.emit("TOURNAMENT_LEFT", data.tournamentData);
			} else if (isNotificationType(data, "TOURNAMENT_JOINED")) {
				stateManager.emit("TOURNAMENT_JOINED", data.tournamentData);
			} else if (isNotificationType(data, "TOURNAMENT_CANCELLED")) {
				stateManager.emit("TOURNAMENT_CANCELLED", data.tournamentData);
			} else if (isNotificationType(data, "TOURNAMENT_CREATED")) {
				stateManager.emit("TOURNAMENT_CREATED", data.tournamentData);
			} else {
				console.log("Unknown websocket message type:", data.type);
			}
		} catch (error) {
			console.error("Failed to parse websocket message:", error);
		}
	};

	ws.onopen = () => {
		console.log("WebSocket connected");
	};

	ws.onclose = () => {
		console.log("WebSocket disconnected");
		setTimeout(() => {
			initializeNotificationWs();
		}, 5000);
	};

	ws.onerror = (error) => {
		console.error("WebSocket error:", error);
	};

	return ws;
}

export async function isOnline(userId: number): Promise<boolean> {
	try {
		const response = await fetch(
			`${API_URL}/api/notifications/user/${userId}/online`,
			{
				method: "GET",
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to check online status");
		}

		const data = await response.json();
		return data.online;
	} catch (error) {
		console.error("Failed to check online status:", error);
		return false;
	}
}
