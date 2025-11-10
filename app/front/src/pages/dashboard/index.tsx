import Miku, { useEffect, useState } from "Miku";
import AnimatedBackground from "../../components/AnimatedBackground";
import UniversalHeader from "../../components/UniversalHeader.tsx";
import { useDashboardData } from "../../hooks/useStates.ts";
import { logOut } from "../../services/api/auth";
import { API_URL } from "../../services/api/config";
import { updateProfile } from "../../services/api/profile";
import { getTournaments } from "../../services/api/tournament";
import { stateManager } from "../../store/StateManager";
import { useNotifications } from "../use-notification";
import ChatsSection from "./components/ChatsSection.tsx";
import Friends from "./components/Friends.tsx";
import Navigation from "./components/Navigation.tsx";
import Overview from "./components/Overview.tsx";
import ProfileSection from "./components/ProfileSection.tsx";
import TournamentsSection from "./components/TournamentsSection.tsx";

export default function DashboardPage() {
	const { profile, gameState, social, achievements } = useDashboardData();
	const { addNotification } = useNotifications();
	const initialSection =
		sessionStorage.getItem("dashboardActiveSection") || "overview";
	const [activeSection, setActiveSection] = useState(initialSection);

	const initialEditMode =
		sessionStorage.getItem("dashboardEditMode") === "true";
	const [isEditMode, setIsEditMode] = useState(initialEditMode);

	useEffect(() => {
		if (sessionStorage.getItem("dashboardActiveSection")) {
			sessionStorage.removeItem("dashboardActiveSection");
		}
		if (sessionStorage.getItem("dashboardEditMode")) {
			sessionStorage.removeItem("dashboardEditMode");
		}
	}, []);

	const [isVisible, setIsVisible] = useState(false);
	const [userStats, setUserStats] = useState({
		wins: gameState?.stats.wins ?? 0,
		losses: gameState?.stats.losses ?? 0,
		rank: profile?.rank ?? 0,
		winRate:
			gameState?.stats.totalGames && gameState.stats.totalGames > 0
				? ((gameState.stats.wins / gameState.stats.totalGames) * 100).toFixed(1)
				: 0,
	});

	const [editableProfile, setEditableProfile] = useState({
		displayName: profile?.displayName || "",
		bio: profile?.bio || "",
		avatarFile: profile?.avatar ? null : (null as File | null),
		avatarPreview: profile?.avatar ? API_URL + `/${profile.avatar}` : "",
	});

	useEffect(() => {
		const loadTournaments = async () => {
			try {
				const tournamentsData = await getTournaments();
				stateManager.setState("tournaments", tournamentsData);
			} catch (_err) {
			} finally {
			}
		};
		loadTournaments();
		setIsVisible(true);
		if (profile) {
			setEditableProfile({
				displayName: profile.displayName || "",
				bio: profile.bio || "",
				avatarFile: null,
				avatarPreview: profile.avatar ? API_URL + `/${profile.avatar}` : "",
			});
		}

		if (gameState) {
			setUserStats({
				wins: gameState.stats.wins,
				losses: gameState.stats.losses,
				rank: profile?.rank ?? 0,
				winRate:
					gameState.stats.totalGames > 0
						? (
								(gameState.stats.wins / gameState.stats.totalGames) *
								100
							).toFixed(1)
						: 0,
			});
		}

		return () => undefined;
	}, [profile, gameState]);

	const handleSave = async () => {
		const result = await updateProfile({
			displayName: editableProfile.displayName,
			bio: editableProfile.bio,
			avatar: editableProfile.avatarFile ?? null,
		});
		console.log("Profile updated:", result);
		if (result.success) {
			setIsEditMode(false);
		} else {
			addNotification({
				type: "error",
				message: `Failed to update profile. ${result.error}`,
				duration: 5000,
				title: "Profile Update Error",
			});
		}
	};

	const handleCancel = () => {
		setIsEditMode(false);
		if (profile) {
			setEditableProfile({
				displayName: profile.displayName || "",
				bio: profile.bio || "",
				avatarFile: null,
				avatarPreview: profile.avatar ? API_URL + `/${profile.avatar}` : "",
			});
		}
	};

	const handleProfileChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setEditableProfile((prev) => ({ ...prev, [name]: value }));
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setEditableProfile((prev) => ({
				...prev,
				avatarFile: file,
				avatarPreview: URL.createObjectURL(file),
			}));
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
			{/* Miku PNG background */}
			<img
				src="/miku3.png"
				alt="Miku"
				className="pointer-events-none select-none absolute z-0 opacity-30 right-0 w-[500px] max-w-full h-auto"
				style={{ filter: "drop-shadow(0 0 10px #0ff)" }}
			/>
			<AnimatedBackground />

			<UniversalHeader
				onLogout={logOut}
				profile={profile}
				onlineUsers={social?.onlineUsers || 0}
			/>

			<Navigation
				activeSection={activeSection}
				setActiveSection={setActiveSection}
			/>

			<main className="relative z-10 px-6 py-8">
				<div className="max-w-7xl mx-auto">
					<div
						className={`transition-all duration-500 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-10"
						}`}
					>
						{activeSection === "overview" && <Overview />}
						{activeSection === "tournaments" && <TournamentsSection />}
						{activeSection === "chats" && <ChatsSection />}
						{activeSection === "friends" && (
							<Friends setActiveSection={setActiveSection} />
						)}
						{activeSection === "profile" && (
							<ProfileSection
								profile={profile}
								gameState={gameState}
								achievements={achievements?.allAchievements || []}
								userAchievementIds={achievements?.userAchievementIds || []}
								userStats={userStats}
								isEditMode={isEditMode}
								editableProfile={editableProfile}
								setIsEditMode={setIsEditMode}
								handleSave={handleSave}
								handleCancel={handleCancel}
								handleProfileChange={handleProfileChange}
								handleAvatarChange={handleAvatarChange}
							/>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
