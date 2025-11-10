import Miku from "../Miku/src/index";
import {
	type AchievementsState,
	type GameState,
	type MessagesState,
	type NotificationsState,
	type SocialState,
	stateManager,
	type UserIdentityState,
	type UserProfileState,
} from "../store/StateManager.ts";
import { Tournament } from "../types/tournament";

export function useUserIdentity() {
	const [identity, setIdentity] = Miku.useState<UserIdentityState | null>(
		stateManager.getState("userIdentity"),
	);

	Miku.useEffect(() => {
		return stateManager.subscribe("userIdentity", setIdentity);
	}, []);

	return identity;
}

export function useUserProfile() {
	const [profile, setProfile] = Miku.useState<UserProfileState | null>(
		stateManager.getState("userProfile"),
	);
	Miku.useEffect(() => {
		return stateManager.subscribe("userProfile", setProfile);
	}, []);

	return profile;
}

export function useGameState() {
	const [gameState, setGameState] = Miku.useState<GameState | null>(
		stateManager.getState("gameState"),
	);

	Miku.useEffect(() => {
		return stateManager.subscribe("gameState", setGameState);
	}, []);

	return gameState;
}

export function useSocialState() {
	const [social, setSocial] = Miku.useState<SocialState | null>(
		stateManager.getState("social"),
	);

	Miku.useEffect(() => {
		return stateManager.subscribe("social", setSocial);
	}, []);

	return social;
}

export function useAchievements() {
	const [achievements, setAchievements] =
		Miku.useState<AchievementsState | null>(
			stateManager.getState("achievements"),
		);

	Miku.useEffect(() => {
		return stateManager.subscribe("achievements", setAchievements);
	}, []);

	return achievements;
}

export function useTournaments() {
	const [tournaments, setTournaments] = Miku.useState<Tournament[] | null>(
		stateManager.getState("tournaments"),
	);

	Miku.useEffect(() => {
		return stateManager.subscribe("tournaments", setTournaments);
	}, []);
	return [...(tournaments || [])];
}

export function useNotifications() {
	const [notifications, setNotifications] =
		Miku.useState<NotificationsState | null>(
			stateManager.getState("notifications"),
		);

	Miku.useEffect(() => {
		return stateManager.subscribe("notifications", setNotifications);
	}, []);

	return notifications;
}

export function useMessages() {
	const [messages, setMessages] = Miku.useState<MessagesState | null>(
		stateManager.getState("messages"),
	);

	Miku.useEffect(() => {
		return stateManager.subscribe("messages", setMessages);
	}, []);

	return messages;
}

export function useDashboardData() {
	const identity = useUserIdentity();
	const profile = useUserProfile();
	const gameState = useGameState();
	const social = useSocialState();
	const achievements = useAchievements();
	const notifications = useNotifications();
	const messages = useMessages();

	return {
		identity,
		profile,
		gameState,
		social,
		achievements,
		notifications,
		messages,
	};
}
