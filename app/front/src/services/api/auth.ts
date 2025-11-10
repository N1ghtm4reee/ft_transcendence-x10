import { redirect } from "Miku/Router";
import { stateManager } from "../../store/StateManager";
import { API_URL } from "./config";

export async function logOut() {
	try {
		const response = await fetch(API_URL + "/api/auth/logout", {
			method: "POST",
			credentials: "include",
		});
		if (!response.ok) {
			throw new Error("Failed to log out");
		}
		const { setIsLoggedIn, setUserDataLoaded } = stateManager.getState(
			"auth",
		) as any;
		const { wsChat, wsNotifications } = stateManager.getState(
			"webSocket",
		) as any;
		if (wsChat) {
			wsChat.close();
		}
		if (wsNotifications) {
			wsNotifications.close();
		}
		setIsLoggedIn(false);
		setUserDataLoaded(false);

		setTimeout(() => redirect("/sign_in"), 1000);
		return true;
	} catch (error) {
		console.error("Failed to log out:", error);
		return false;
	}
}
