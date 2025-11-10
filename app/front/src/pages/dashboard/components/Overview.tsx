"use client";

import Miku from "Miku";
import { redirect } from "Miku/Router";
import type {
	GameState,
	NotificationsState,
	SocialState,
	UserProfileState,
} from "../../../store/StateManager.ts";
import { stateManager } from "../../../store/StateManager.ts";

export default function Overview() {
	const userProfile = stateManager.getState<UserProfileState>("userProfile");
	const gameState = stateManager.getState<GameState>("gameState");
	const socialState = stateManager.getState<SocialState>("social");

	const notificationsState =
		stateManager.getState<NotificationsState>("notifications");

	const userStats = gameState?.stats || {
		totalGames: 0,
		wins: 0,
		losses: 0,
		currentStreak: 0,
	};
	const winRate =
		userStats.totalGames > 0
			? Math.round((userStats.wins / userStats.totalGames) * 100)
			: 0;
	const recentGames = gameState?.history?.slice(0, 5) || [];
	const onlineFriends =
		socialState?.friends?.filter((friend) => friend.status === "online") || [];

	const handleQuickMatch = () => {
		redirect("/game");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-gray-400 text-sm">Global Rank</p>
							<p className="text-3xl font-bold text-cyan-400">
								{userProfile?.rank !== null
									? "#" + userProfile?.rank
									: "Unranked"}
							</p>
						</div>
						<div className="text-4xl"></div>
					</div>
				</div>

				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 hover:border-green-500/50 transition-all">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-gray-400 text-sm">Win Rate</p>
							<p className="text-3xl font-bold text-green-400">{winRate}%</p>
						</div>
						<div className="text-4xl"></div>
					</div>
				</div>

				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-gray-400 text-sm">Total Wins</p>
							<p className="text-3xl font-bold text-blue-400">
								{userStats.wins}
							</p>
						</div>
						<div className="text-4xl"></div>
					</div>
				</div>

				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-gray-400 text-sm">Online Friends</p>
							<p className="text-3xl font-bold text-cyan-400">
								{onlineFriends.length}
							</p>
						</div>
						<div className="text-4xl"></div>
					</div>
				</div>
			</div>

			<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
				<h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
				<div className="space-y-4">
					{recentGames.length > 0 ? (
						recentGames.map((game, index) => (
							<div
								key={game.id || index}
								className="flex items-center space-x-4 p-3 bg-gray-700/30 rounded-xl"
							>
								<div
									className={`w-2 h-2 rounded-full ${
										game.result === "win" ? "bg-green-500" : "bg-red-500"
									}`}
								></div>
								<div className="flex-1">
									<p className="text-white">
										{game.result === "win" ? "Won" : "Lost"} match against{" "}
										{game.opponentName || "Unknown Player"}
									</p>
									<p className="text-gray-400 text-sm">
										{new Date(game.playedAt).toLocaleDateString()}
									</p>
								</div>
								<div
									className={`font-semibold ${
										game.result === "win" ? "text-green-400" : "text-red-400"
									}`}
								>
									{game.result === "win"
										? `+${game.playerScore}`
										: `-${game.opponentScore}`}{" "}
									points
								</div>
							</div>
						))
					) : (
						<div className="text-center text-gray-400 py-8">
							<div className="text-6xl mb-4"></div>
							<p className="text-lg mb-2">No recent games</p>
							<p className="text-sm">
								Start playing to see your match history here!
							</p>
							<button
								onClick={handleQuickMatch}
								className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
							>
								Play Your First Game
							</button>
						</div>
					)}
				</div>
			</div>

			{notificationsState && notificationsState.unreadCount > 0 && (
				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-xl font-bold text-white">Notifications</h3>
							<p className="text-gray-400">
								You have {notificationsState.unreadCount} unread notifications
							</p>
						</div>
						<div className="text-4xl"></div>
					</div>
				</div>
			)}
		</div>
	);
}
