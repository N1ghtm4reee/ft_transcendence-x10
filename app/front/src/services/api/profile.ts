import { stateManager } from "../../store/StateManager";
import { API_URL } from "./config";

export async function updateProfile(profileData: any) {
	try {
		let formData: FormData | string;
		if (profileData.avatar) {
			formData = new FormData();
			Object.keys(profileData).forEach((key) => {
				if (profileData[key] !== null && profileData[key] !== undefined) {
					(formData as FormData).append(key, profileData[key]);
				}
			});
		} else formData = JSON.stringify(profileData);
		const headers: HeadersInit = {};
		if (!profileData.avatar) headers["Content-Type"] = "application/json";

		const response = await fetch(API_URL + "/api/user-management/profiles", {
			method: "PATCH",
			headers: headers,
			body: formData,
			credentials: "include",
		});

		const res = await response.json();

		if (!response.ok) throw new Error(`${res.error}`);
		stateManager.emit("PROFILE_UPDATED", {
			...profileData,
			avatar: res.avatarUrl,
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to update profile:", error);
		return { error: (error as Error).message, success: false };
	}
}

export async function searchProfiles(username: string) {
	try {
		const response = await fetch(
			API_URL + `/api/user-management/profile?username=${username}`,
			{
				credentials: "include",
			},
		);
		if (!response.ok) {
			throw new Error("Failed to search profiles");
		}
		const data = await response.json();
		const users = data.users;
		return users;
	} catch (error) {
		console.error("Failed to search profiles:", error);
		return [];
	}
}

export async function getProfileByUsername(
	username: string,
): Promise<any | null> {
	try {
		const response = await fetch(
			API_URL + `/api/user-management/profiles/${username}`,
			{
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to get profile");
		}

		const profile = await response.json();
		return profile;
	} catch (error) {
		console.error("Failed to get profile:", error);
		return null;
	}
}

export async function getPlayerProfile(userId: string) {
	try {
		const response = await fetch(
			`${API_URL}/api/user-management/users/${userId}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			},
		);

		if (!response.ok) {
			throw new Error("Failed to fetch player profile");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Failed to fetch player profile:", error);
		throw error;
	}
}
