import { API_URL } from "./config";

export async function createTournament(tournamentData: {
	name: string;
	status: string;
	startTime: string;
	username: string;
}) {
	try {
		const response = await fetch(API_URL + "/api/tournament/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(tournamentData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to create tournament");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Failed to create tournament:", error);
		throw error;
	}
}

export async function joinTournament(tournamentId: string, username: string) {
	try {
		const response = await fetch(API_URL + "/api/tournament/join", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ tournamentId, username }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to join tournament");
		}
		return { success: true, data: { id: tournamentId } };
	} catch (error) {
		console.error("Failed to join tournament:", error);
		return { success: false, error: (error as Error).message };
	}
}

export async function leaveTournament(tournamentId: string) {
	try {
		const response = await fetch(API_URL + "/api/tournament/leave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ tournamentId }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to leave tournament");
		}

		return { success: true } as const;
	} catch (error) {
		console.error("Failed to leave tournament:", error);
		return { success: false, error: (error as Error).message } as const;
	}
}

export async function startTournament(tournamentId: string) {
	try {
		const response = await fetch(
			API_URL + `/api/tournament/${tournamentId}/start`,
			{
				method: "POST",
				credentials: "include",
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to start tournament");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Failed to start tournament:", error);
		throw error;
	}
}

export async function stopTournament(tournamentId: string) {
	try {
		const response = await fetch(
			API_URL + `/api/tournament/${tournamentId}/stop`,
			{
				method: "POST",
				credentials: "include",
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to stop tournament");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Failed to stop tournament:", error);
		throw error;
	}
}

export async function getTournaments() {
	try {
		const response = await fetch(API_URL + "/api/tournament/list", {
			method: "GET",
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Failed to fetch tournaments");
		}

		const result = await response.json();
		return result.tournaments;
	} catch (error) {
		console.error("Failed to fetch tournaments:", error);
		throw error;
	}
}

export async function getTournament(tournamentId: string) {
	try {
		const response = await fetch(API_URL + `/api/tournament/${tournamentId}`, {
			method: "GET",
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Failed to fetch tournament");
		}

		const result = await response.json();
		return result.tournament;
	} catch (error) {
		console.error("Failed to fetch tournament:", error);
		throw error;
	}
}

export async function getTournamentMatches(tournamentId: string) {
	try {
		const response = await fetch(
			API_URL + `/api/tournament/${tournamentId}/matches`,
			{
				method: "GET",
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to fetch tournament matches");
		}

		const result = await response.json();
		return result.matches;
	} catch (error) {
		console.error("Failed to fetch tournament matches:", error);
		throw error;
	}
}

export async function sendTournamentChallenge(
	matchId: string,
	opponentId: string,
) {
	try {
		const response = await fetch(
			API_URL + `/api/tournament/match/${matchId}/challenge`,
			{
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ opponentId }),
			},
		);

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Authentication failed. Please log in again.");
			} else if (response.status === 404) {
				throw new Error("Match not found or tournament service unavailable.");
			} else {
				const errorText = await response.text().catch(() => "Unknown error");
				throw new Error(
					`Failed to start tournament match (${response.status}): ${errorText}`,
				);
			}
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Error starting tournament match:", error);
		throw error;
	}
}
