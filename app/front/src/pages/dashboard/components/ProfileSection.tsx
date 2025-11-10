import Miku from "Miku";
import type {
	GameState,
	UserProfileState,
} from "../../../store/StateManager.ts";
import { Achievement } from "../../../types/achievement";

interface EditableProfile {
	displayName: string;
	bio: string;
	avatarFile: File | null;
	avatarPreview: string;
}

interface ProfileSectionProps {
	profile: UserProfileState | null;
	gameState: GameState | null;
	achievements: Achievement[];
	userAchievementIds: string[];
	userStats: {
		wins: number;
		losses: number;
		rank: number | null;
		winRate: string | number;
	};
	isEditMode: boolean;
	editableProfile: EditableProfile;
	setIsEditMode: (mode: boolean) => void;
	handleSave: () => void;
	handleCancel: () => void;
	handleProfileChange: (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => void;
	handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileSection({
	profile,
	gameState,
	achievements,
	userAchievementIds,
	userStats,
	isEditMode,
	editableProfile,
	setIsEditMode,
	handleSave,
	handleCancel,
	handleProfileChange,
	handleAvatarChange,
}: ProfileSectionProps) {
	console.log("ProfileSection Rendered", {
		profile,
		gameState,
		achievements,
		userAchievementIds,
		userStats,
	});
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold text-white">Profile</h2>
				<div className="flex items-center space-x-4">
					{isEditMode ? (
						<>
							<button
								onClick={handleSave}
								className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2 rounded-full font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
							>
								Save Changes
							</button>
							<button
								onClick={handleCancel}
								className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white px-6 py-2 rounded-full font-semibold transition-all border border-gray-600 hover:border-gray-500"
							>
								Cancel
							</button>
						</>
					) : (
						<button
							onClick={() => setIsEditMode(true)}
							className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
						>
							Edit Profile
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
					<div className="text-center">
						<div className="relative w-24 h-24 mx-auto mb-4 group">
							<div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
								{editableProfile.avatarPreview ? (
									<img
										src={editableProfile.avatarPreview}
										alt="Avatar"
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-white font-bold text-2xl">
										{(editableProfile.displayName || "JD")
											.split(" ")
											.map((n) => n[0])
											.join("")}
									</span>
								)}
							</div>

							{isEditMode && (
								<label
									htmlFor="avatar-upload"
									className="absolute inset-0 bg-black/0 group-hover:bg-black/60 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
								>
									<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
										<div className="bg-white/20 backdrop-blur-sm rounded-full p-2 mb-1">
											<span className="text-white text-lg"></span>
										</div>
										<span className="text-white text-xs font-medium">
											Change
										</span>
									</div>
									<input
										id="avatar-upload"
										type="file"
										className="hidden"
										accept="image/*"
										onChange={handleAvatarChange}
									/>
								</label>
							)}
						</div>

						<div className="mb-4">
							{isEditMode ? (
								<div className="relative">
									<input
										type="text"
										name="displayName"
										value={editableProfile.displayName}
										onChange={handleProfileChange}
										placeholder="Enter your name"
										className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white text-center text-xl font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
									/>
								</div>
							) : (
								<h3 className="text-2xl font-bold text-white">
									{editableProfile.displayName || "John Doe"}
								</h3>
							)}
						</div>

						<div className="mb-6">
							{isEditMode ? (
								<div className="relative">
									<textarea
										name="bio"
										value={editableProfile.bio}
										onChange={handleProfileChange}
										placeholder="Tell us about yourself..."
										className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white text-center text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
										rows={3}
									/>
								</div>
							) : (
								<p className="text-gray-400 text-sm leading-relaxed">
									{editableProfile.bio || "Pro Player • Ping Pong Enthusiast"}
								</p>
							)}
						</div>

						<div className="flex items-center justify-center space-x-2 mb-6">
							<div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full px-4 py-2">
								<span className="text-cyan-400 font-bold text-lg">
									#{userStats.rank !== null ? userStats.rank : "Unranked"}
								</span>
								<span className="text-gray-400 text-sm ml-1">Global Rank</span>
							</div>
						</div>
					</div>

					<div className="space-y-4 bg-gray-700/30 rounded-xl p-4">
						<div className="flex justify-between items-center">
							<span className="text-gray-400 text-sm">Total Wins</span>
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								<span className="text-green-400 font-semibold">
									{gameState?.stats.wins || 0}
								</span>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-400 text-sm">Total Losses</span>
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-red-500 rounded-full"></div>
								<span className="text-red-400 font-semibold">
									{gameState?.stats.losses || 0}
								</span>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-400 text-sm">Win Rate</span>
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
								<span className="text-cyan-400 font-semibold">
									{gameState?.stats?.totalGames &&
									gameState.stats.totalGames > 0
										? `${((gameState.stats.wins / gameState.stats.totalGames) * 100).toFixed(1)}%`
										: "0%"}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="lg:col-span-2 space-y-6">
					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4">
							Recent Performance
						</h3>
						<div className="flex items-end space-x-2 h-32">
							{(() => {
								const recentGames =
									gameState?.history?.slice(-10).reverse() || [];
								const filledGames = Object.assign(
									new Array(10).fill(null),
									recentGames,
								);

								return filledGames.map((game: any, index: number) => {
									if (!game) {
										return (
											<div
												key={`placeholder-${index}`}
												className="bg-gray-700/40 rounded-t flex-1"
												style={{ height: "20%" }}
											></div>
										);
									}
									const scoreRatio =
										game.playerScore + game.opponentScore > 0
											? game.playerScore /
												(game.playerScore + game.opponentScore)
											: 0.5;
									return (
										<div
											key={game.id}
											className={`rounded-t flex-1 transition-all hover:opacity-80 ${game.result === "win" ? "bg-gradient-to-t from-green-500 to-green-400" : "bg-gradient-to-t from-red-500 to-red-400"}`}
											style={{
												height: `${Math.max(20, Math.min(100, scoreRatio * 100))}%`,
											}}
											title={`${game.result === "win" ? "Win" : "Loss"} - ${game.playerScore}:${game.opponentScore}`}
										></div>
									);
								});
							})()}
						</div>
						<div className="flex justify-between text-gray-400 text-sm mt-2">
							<span>
								{gameState?.history?.length
									? `${gameState.history.length} games ago`
									: "10 games ago"}
							</span>
							<span>Latest</span>
						</div>
					</div>

					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4">Achievements</h3>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{achievements &&
								achievements?.map((achievement, index) => {
									const hasAchievement = userAchievementIds?.includes(
										achievement.id,
									);
									return (
										<div
											key={index}
											className={`text-center p-4 rounded-xl border transition-all hover:scale-105 ${hasAchievement ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 shadow-lg" : "bg-gray-700/30 border-gray-600 hover:border-gray-500"}`}
										>
											<div
												className={`text-3xl mb-2 transition-all ${hasAchievement ? "" : "grayscale opacity-50"}`}
											>
												{achievement.icon}
											</div>
											<p
												className={`text-sm font-semibold ${hasAchievement ? "text-white" : "text-gray-400"}`}
											>
												{achievement.title}
											</p>
										</div>
									);
								})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
