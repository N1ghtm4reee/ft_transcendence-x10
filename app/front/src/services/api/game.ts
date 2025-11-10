import { stateManager } from "../../store/StateManager";
import { API_URL, WS_URL } from "./config";
import type { GameUpdate } from "./types";

export async function finishGame(gameResult: any) {
	try {
		const response = await fetch(API_URL + "/api/game/finish", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(gameResult),
		});

		if (response.ok) {
			stateManager.emit("GAME_FINISHED", gameResult);
			return true;
		} else {
			throw new Error("Failed to finish game");
		}
	} catch (error) {
		console.error("Failed to finish game:", error);
		return false;
	}
}

export async function rejectChallenge(challengeId: string) {
	try {
		const response = await fetch(API_URL + "/api/game/reject/" + challengeId, {
			method: "POST",
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Failed to reject challenge");
		}
	} catch (error) {
		console.error("Failed to reject challenge:", error);
		throw error;
	}
}

export async function acceptChallenge(gameId: string) {
	try {
		const response = await fetch(API_URL + "/api/game/accepted/" + gameId, {
			method: "POST",
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Failed to accept challenge");
		}
		stateManager.emit("GAME_ACCEPTED", { requestId: gameId });
	} catch (error) {
		console.error("Failed to accept challenge:", error);
		throw error;
	}
}

export async function gameConnect(
	playerId: string,
	gameId: string,
	{
		onMessage,
		onClose,
		onOpen,
		onError,
	}: {
		onMessage: (data: GameUpdate) => void;
		onClose: () => void;
		onOpen: () => void;
		onError?: (error: Event) => void;
	},
) {
	try {
		const socket = new WebSocket(
			WS_URL + "/ws/game?playerId=" + playerId + "&gameId=" + gameId,
		);

		socket.onopen = onOpen;

		socket.onerror = (error) => {
			console.error("WebSocket ERROR:", error);
			if (onError) onError(error);
		};

		socket.onmessage = (event) => {
			try {
				const data: GameUpdate = JSON.parse(event.data);
				onMessage(data);
			} catch (error) {
				console.error("Failed to parse game update:", error);
			}
		};
		socket.onclose = onClose;
		return socket;
	} catch (error) {
		console.error("Failed to connect to game:", error);
		return error;
	}
}

export async function sendChallenge(
	opponentId: string,
	mode: "classic" | "tournament" = "classic",
	matchId?: string,
) {
	try {
		let url =
			API_URL +
			"/api/game/challenge?opponentId=" +
			opponentId +
			"&mode=" +
			mode;
		if (matchId) {
			url += "&matchId=" + matchId;
		}

		const response = await fetch(url, {
			method: "POST",
			credentials: "include",
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Authentication failed. Please log in again.");
			} else if (response.status === 403) {
				throw new Error("You don't have permission to send challenges.");
			} else if (response.status === 404) {
				throw new Error("User not found or game service unavailable.");
			} else {
				const errorText = await response.text().catch(() => "Unknown error");
				throw new Error(
					`Failed to send challenge (${response.status}): ${errorText}`,
				);
			}
		}

		// Return the response data so the caller can get the gameId
		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Failed to send challenge:", error);
		throw error;
	}
}
