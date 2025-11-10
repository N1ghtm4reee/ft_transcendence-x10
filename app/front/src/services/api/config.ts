export const API_URL = "https://localhost:3000";
export const WS_URL = "wss://localhost:3000";

export async function checkAuthStatus(): Promise<boolean> {
	try {
		const response = await fetch(API_URL + "/api/auth/verify", {
			method: "GET",
			credentials: "include",
		});
		return response.ok;
	} catch (error) {
		console.error("Failed to check auth status:", error);
		return false;
	}
}
