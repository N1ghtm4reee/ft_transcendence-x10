import Miku, { useEffect, useState } from "Miku";
import { redirect } from "Miku/Router";
import AnimatedBackground from "../../components/AnimatedBackground";
import UniversalHeader from "../../components/UniversalHeader.tsx";
import { logOut } from "../../services/api/auth";
import { getOrCreateConversation } from "../../services/api/chat";
import {
	blockUser,
	removeFriend,
	sendFriendRequest,
	unblockUser,
} from "../../services/api/friends";
import { sendChallenge } from "../../services/api/game";
import { getProfileByUsername } from "../../services/api/profile";
import type {
	AchievementsState,
	GameState,
	MessagesState,
	SocialState,
	UserProfileState,
} from "../../store/StateManager.ts";
import { stateManager } from "../../store/StateManager.ts";
import { Achievement } from "../../types/achievement";
import { Friend } from "../../types/friend";
import { GameHistory } from "../../types/game";
import { Profile } from "../../types/profile";
import AchievementsTab from "./components/AchievementsTab.tsx";
import MatchesTab from "./components/MatchesTab.tsx";
import OverviewTab from "./components/OverviewTab.tsx";
import ProfileHeader from "./components/ProfileHeader.tsx";
import TabNavigation from "./components/TabNavigation.tsx";
import {
	type Match,
	type MutualMatch,
	type ProfileUser,
	type Tab,
	type UserAchievement,
} from "./components/types.ts";
export default function UserProfilePage({
	isLoggedIn,
}: {
	isLoggedIn: boolean;
}) {
	console.log(
		"UserProfilePage rendered with isLoggedIn:",
		stateManager.getState<SocialState>("social")?.friends,
		isLoggedIn,
	);
	const [isVisible, setIsVisible] = useState(false);
	const [activeTab, setActiveTab] = useState("overview");
	const [isFriend, setIsFriend] = useState(false);
	const [isOnline, setIsOnline] = useState(false);
	const [profileData, setProfileData] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isOwnProfile, setIsOwnProfile] = useState(false);
	const [hasPendingRequest, setHasPendingRequest] = useState(false);

	const currentUser = stateManager.getState<UserProfileState>("userProfile");
	const gameState = stateManager.getState<GameState>("gameState");
	const socialState = stateManager.getState<SocialState>("social");
	const achievementsState =
		stateManager.getState<AchievementsState>("achievements");

	const getUsername = () => {
		const pathSegments = window.location.pathname
			.split("/")
			.filter((segment) => segment);

		if (pathSegments[0] === "profile" && pathSegments[1]) {
			return pathSegments[1];
		}

		if (pathSegments[0] === "app_home") {
			return (
				currentUser?.displayName.toLowerCase().replace(/\s+/g, "") ||
				currentUser?.id ||
				null
			);
		}

		return null;
	};

	const transformProfileData = (
		profile: Profile,
		achievements: Achievement[],
	): ProfileUser => {
		const winRate =
			profile.gameStats.totalGames > 0
				? (profile.gameStats.wins / profile.gameStats.totalGames) * 100
				: 0;

		return {
			id: profile.profile.id,
			avatar: profile.profile.avatar,
			name: profile.profile.displayName,
			username: `@${profile.profile.displayName.toLowerCase().replace(/\s+/g, "")}`,
			rank: profile.profile.rank,
			level: Math.floor(profile.gameStats.totalGames / 10) + 1,
			wins: profile.gameStats.wins,
			losses: profile.gameStats.losses,
			winRate: Math.round(winRate * 10) / 10,
			winStreak: profile.gameStats.currentStreak,
			currentStreak: profile.gameStats.currentStreak,
			bestStreak: profile.gameStats.bestStreak,
			joinDate: new Date(profile.profile.createdAt).toLocaleDateString(),
			totalMatches: profile.gameStats.totalGames,
			tournamentsWon: profile.gameStats.tournamentWins,
			xp: profile.gameStats.wins * 100 + profile.gameStats.totalGames * 10,
			overallRecord: {
				wins: profile.overallRecord?.wins || 0,
				losses: profile.overallRecord?.losses || 0,
			},
		};
	};

	const transformGameHistory = (gameHistory: GameHistory[]): Match[] => {
		console.log("Transforming game history:", gameHistory);
		return gameHistory.map((game, index) => ({
			id: game.id,
			opponent: game.opponentName,
			result: game.result as "win" | "loss",
			score: `${game.playerScore}-${game.opponentScore}`,
			time: new Date(game.playedAt).toLocaleDateString(),
		}));
	};

	const transformAchievements = (
		userAchievementIds: string[],
		allAchievements: Achievement[],
	): UserAchievement[] => {
		return allAchievements.map((achievement) => ({
			id: achievement.id,
			name: achievement.title,
			title: achievement.title,
			icon: achievement.icon,
			description: achievement.description,
			unlocked: userAchievementIds.includes(achievement.id),
		}));
	};

	const checkFriendship = (userId: string, friends: Friend[]): boolean => {
		return friends.some((friend) => friend.id === userId);
	};

	const checkPendingRequest = (
		userId: string,
		sentRequests: any[],
	): boolean => {
		const hasPending = sentRequests.some(
			(request) => request.user.id === userId,
		);
		console.log(
			`Checking pending request for ${userId}:`,
			hasPending,
			sentRequests,
		);
		return hasPending;
	};

	const username = getUsername();

	useEffect(() => {
		const loadProfile = async () => {
			setLoading(true);
			setError(null);

			if (!username) {
				setError("Invalid profile URL");
				setLoading(false);
				return;
			}

			try {
				console.log("Profile detection:", {
					username,
					currentUserId: currentUser?.id,
					currentUserDisplayName: currentUser?.displayName,
					pathname: window.location.pathname,
				});

				const isOwn = currentUser && currentUser.id === username;
				setIsOwnProfile(!!isOwn);

				console.log("Is own profile:", isOwn);

				if (isOwn && currentUser) {
					console.log("Using current user data for own profile", gameState);
					const mockProfile: Profile = {
						profile: {
							...currentUser,
							status: "online" as const,
							rank: 7,
							createdAt: currentUser.createdAt || new Date().toISOString(),
						},
						gameHistory: gameState?.history || [],
						gameStats: gameState?.stats || {
							totalGames: 0,
							wins: 0,
							losses: 0,
							tournaments: 0,
							tournamentWins: 0,
							bestStreak: 0,
							currentStreak: 0,
						},
						achievements: achievementsState?.userAchievementIds || [],
						gamesH2h: [],
						isBlocked: false,
					};

					setProfileData(mockProfile);
					setIsFriend(false);
					setHasPendingRequest(false);
					setIsOnline(true);
				} else {
					const profile = await getProfileByUsername(username);
					if (profile) {
						setProfileData(profile);

						const isActuallyOwnProfile =
							currentUser && currentUser.id === profile.profile.id;
						setIsOwnProfile(!!isActuallyOwnProfile);

						if (!isActuallyOwnProfile) {
							console.log("friends ", socialState);
							if (socialState) {
								console.log(socialState.friends);
								setIsFriend(
									checkFriendship(profile.profile.id, socialState.friends),
								);
								setHasPendingRequest(
									checkPendingRequest(
										profile.profile.id,
										socialState.friendRequests.sent,
									),
								);
							}
						} else {
							setIsFriend(false);
							setHasPendingRequest(false);
						}

						setIsOnline(profile.profile.status === "online");
					} else {
						setError("Profile not found");
					}
				}
			} catch (err) {
				console.error("Failed to load profile:", err);
				setError("Failed to load profile");
			} finally {
				setLoading(false);
			}
		};

		loadProfile();
	}, [isLoggedIn, username, currentUser?.id]);

	useEffect(() => {
		if (profileData && !isOwnProfile && socialState) {
			setIsFriend(checkFriendship(profileData.profile.id, socialState.friends));
			setHasPendingRequest(
				checkPendingRequest(
					profileData.profile.id,
					socialState.friendRequests.sent,
				),
			);
		}
	}, [profileData, isOwnProfile, socialState]);

	useEffect(() => {
		if (isOwnProfile && currentUser && gameState && achievementsState) {
			const updatedProfile: Profile = {
				profile: {
					...currentUser,
					status: isOnline ? "online" : "offline",
				},
				gameHistory: gameState.history || [],
				gameStats: gameState.stats || {
					totalGames: 0,
					wins: 0,
					losses: 0,
					tournaments: 0,
					tournamentWins: 0,
					bestStreak: 0,
					currentStreak: 0,
				},
				achievements: achievementsState.userAchievementIds || [],
				gamesH2h: [],
				isBlocked: false,
			};
			console.log("this in useeffect", gameState);
			setProfileData(updatedProfile);
		}
	}, [isOwnProfile, currentUser, gameState, achievementsState]);

	const profileUser =
		profileData && achievementsState
			? transformProfileData(
					profileData,
					achievementsState.allAchievements || [],
				)
			: null;
	console.log("profile data game history", profileData?.gameHistory);
	const recentMatches: Match[] = profileData
		? transformGameHistory(profileData.gameHistory.slice(0, 10))
		: [];
	console.log("recent matches", recentMatches);
	const achievements: Achievement[] =
		profileData && achievementsState
			? transformAchievements(
					profileData.achievements,
					achievementsState.allAchievements,
				)
			: [];
	const mutualHistory: MutualMatch[] = profileData
		? profileData.gamesH2h.map((game, index) => ({
				id: index,
				result: game.result as "win" | "loss",
				score: `${game.playerScore}-${game.opponentScore}`,
				date: new Date(game.playedAt).toLocaleDateString(),
			}))
		: [];

	const tabs: Tab[] = [
		{ id: "overview", label: "Overview", icon: "" },
		{ id: "matches", label: "Recent Matches", icon: "" },
		{ id: "achievements", label: "Achievements", icon: "" },
	];

	useEffect(() => {
		if (!loading) {
			setIsVisible(true);

			return undefined;
		}
	}, [loading]);

	const handleFriendToggle = async () => {
		if (!isOwnProfile && profileUser && !hasPendingRequest) {
			try {
				if (isFriend) {
					const success = await removeFriend(profileUser.id);
					if (success) {
						setIsFriend(false);
					}
				} else {
					const success = await sendFriendRequest(
						profileUser.id,
						profileUser.name,
					);
					if (success) {
						setHasPendingRequest(true);
						console.log("Friend request sent!");
					}
				}
			} catch (error) {
				console.error("Error toggling friend status:", error);
			}
		}
	};

	const handleChallenge = () => {
		if (profileUser)
			if (profileData?.profile) sendChallenge(profileData.profile.id);
	};

	const handleMessage = async () => {
		if (!isOwnProfile && profileUser) {
			if (!isFriend) {
				console.log("Cannot send message: User is not a friend");
				return;
			}

			try {
				const conversation = await getOrCreateConversation(profileUser.id);

				if (conversation) {
					const messagesState =
						stateManager.getState<MessagesState>("messages");
					if (messagesState) {
						stateManager.setState<MessagesState>("messages", {
							...messagesState,
							activeChat: conversation.id,
						});
					}

					sessionStorage.setItem("dashboardActiveSection", "chats");

					redirect("/dashboard");
				}
			} catch (error) {
				console.error("Error opening message:", error);
			}
		}
	};

	const handleEditProfile = () => {
		if (isOwnProfile) {
			sessionStorage.setItem("dashboardActiveSection", "profile");
			sessionStorage.setItem("dashboardEditMode", "true");

			redirect("/dashboard");
		}
	};

	const handleBlock = async () => {
		if (isOwnProfile || !profileUser || !profileData?.profile) return;

		const targetId = profileData.profile.id;
		try {
			if (profileData.isBlocked) {
				const res = await unblockUser(targetId);
				if (res.success)
					setProfileData((prev) =>
						prev ? { ...prev, isBlocked: false } : prev,
					);
			} else {
				const res = await blockUser(targetId);
				if (res.success) {
					setProfileData((prev) =>
						prev ? { ...prev, isBlocked: true } : prev,
					);
					stateManager.emit("FRIEND_REMOVED", { user: { id: targetId } });
				}
			}
		} catch (err) {
			console.error("Error toggling block status:", err);
		}
	};

	const renderTabContent = () => {
		if (!profileUser) return null;

		switch (activeTab) {
			case "overview":
				return (
					<OverviewTab
						profileUser={profileUser}
						mutualHistory={mutualHistory}
					/>
				);
			case "matches":
				return <MatchesTab recentMatches={recentMatches} />;
			case "achievements":
				return (
					<AchievementsTab achievements={achievements as UserAchievement[]} />
				);
			default:
				return (
					<OverviewTab
						profileUser={profileUser}
						mutualHistory={mutualHistory}
					/>
				);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
				<AnimatedBackground />

				<div className="relative z-10 flex items-center justify-center min-h-screen px-6">
					<div className="text-center max-w-lg mx-auto">
						<div
							className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
						>
							<div
								key="loading-card"
								className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-12 shadow-2xl"
							>
								<div key="loading-spinner" className="mb-6">
									<div className="w-16 h-16 mx-auto border-4 border-gray-600 border-t-cyan-500 rounded-full animate-spin"></div>
								</div>

								<h2 key="loading-title" className="text-3xl font-bold mb-4">
									<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
										Loading Profile
									</span>
								</h2>

								<p key="loading-message" className="text-xl text-gray-300">
									Fetching player information...
								</p>

								<div
									key="loading-dots"
									className="flex justify-center space-x-1 mt-6"
								>
									<div
										key="dot-1"
										className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
									></div>
									<div
										key="dot-2"
										className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.1s" }}
									></div>
									<div
										key="dot-3"
										className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error || !profileData || !profileUser) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
				<AnimatedBackground />

				<div className="relative z-10 flex items-center justify-center min-h-screen px-6">
					<div className="text-center max-w-2xl mx-auto">
						<div
							className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
						>
							<div
								key="main-error-card"
								className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-12 mb-8 shadow-2xl"
							>
								<div
									key="pensive-emoji"
									className="text-8xl mb-6 animate-bounce"
								></div>

								<h1 key="error-title" className="text-4xl font-bold mb-4">
									<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
										Profile Not Found
									</span>
								</h1>

								<p
									key="error-message"
									className="text-xl text-gray-300 mb-8 leading-relaxed"
								>
									{error === "Profile not found" || error === null
										? "We couldn't find the profile you're looking for. The user might not exist or the profile may have been removed."
										: error}
								</p>

								<div className="bg-gray-700/30 rounded-xl p-6 mb-8">
									<h3
										key="suggestions-title"
										className="text-lg font-semibold text-white mb-4"
									>
										What you can do:
									</h3>
									<div
										key="suggestions-list"
										className="space-y-3 text-gray-300"
									>
										<div
											key="suggestion-1"
											className="flex items-center space-x-3"
										>
											<span className="text-orange-400">•</span>
											<span>Check the URL for any typos</span>
										</div>
										<div
											key="suggestion-2"
											className="flex items-center space-x-3"
										>
											<span className="text-orange-400">•</span>
											<span>Search for the user in the dashboard</span>
										</div>
									</div>
								</div>

								<div
									key="action-buttons"
									className="flex flex-col sm:flex-row gap-4 justify-center"
								>
									<button
										key="dashboard-button"
										onClick={() => redirect("/dashboard")}
										className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
									>
										Go to Dashboard
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
			<AnimatedBackground />

			<UniversalHeader
				onLogout={logOut}
				profile={currentUser}
				onlineUsers={socialState?.onlineUsers || 0}
			/>

			<main className="relative z-10 px-6 py-8">
				<div className="max-w-7xl mx-auto">
					<div
						className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
					>
						<ProfileHeader
							profileUser={profileUser}
							isOnline={isOnline}
							isFriend={isFriend}
							isBlocked={profileData.isBlocked}
							isOwnProfile={isOwnProfile}
							hasPendingRequest={hasPendingRequest}
							onFriendToggle={handleFriendToggle}
							onChallenge={handleChallenge}
							onMessage={handleMessage}
							onEditProfile={handleEditProfile}
							onBlock={handleBlock}
						/>

						<TabNavigation
							activeTab={activeTab}
							onTabChange={setActiveTab}
							tabs={tabs}
						/>

						<div className="transition-all duration-300">
							{renderTabContent()}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
