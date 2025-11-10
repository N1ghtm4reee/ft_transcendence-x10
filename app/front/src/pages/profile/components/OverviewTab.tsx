import Miku from "Miku";
import type { MutualMatch, ProfileUser } from "./types";

interface OverviewTabProps {
	profileUser: ProfileUser;
	mutualHistory: MutualMatch[];
}

export default function OverviewTab({
	profileUser,
	mutualHistory,
}: OverviewTabProps) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
			{/* Stats Overview */}
			<div className="space-y-6">
				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
					<h3 className="text-xl font-bold text-white mb-4">
						Performance Stats
					</h3>
					<div className="grid grid-cols-2 gap-3">
						<div className="text-center p-4 bg-gray-700/30 rounded-xl">
							<div className="text-2xl font-bold text-green-400">
								{profileUser.wins}
							</div>
							<div className="text-gray-400 text-sm">Wins</div>
						</div>
						<div className="text-center p-4 bg-gray-700/30 rounded-xl">
							<div className="text-2xl font-bold text-red-400">
								{profileUser.losses}
							</div>
							<div className="text-gray-400 text-sm">Losses</div>
						</div>
						<div className="text-center p-4 bg-gray-700/30 rounded-xl">
							<div className="text-2xl font-bold text-cyan-400">
								{profileUser.winRate}%
							</div>
							<div className="text-gray-400 text-sm">Win Rate</div>
						</div>
					</div>
				</div>

				<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
					<h3 className="text-xl font-bold text-white mb-4">Streaks</h3>
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-gray-400">Current Streak:</span>
							<span className="text-cyan-400 font-bold flex items-center">
								{profileUser.currentStreak} wins
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-400">Best Streak:</span>
							<span className="text-yellow-400 font-bold">
								{profileUser.bestStreak} wins
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Head-to-Head */}
			<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
				<h3 className="text-xl font-bold text-white mb-4">
					Head-to-Head vs You
				</h3>
				<div className="space-y-4">
					{mutualHistory.map((match) => (
						<div
							key={match.id}
							className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl"
						>
							<div className="flex items-center space-x-3">
								<div
									className={`w-3 h-3 rounded-full ${match.result === "win" ? "bg-red-500" : "bg-green-500"}`}
								></div>
								<div>
									<div className="text-white font-semibold">{match.score}</div>
									<div className="text-gray-400 text-sm">{match.date}</div>
								</div>
							</div>
							<div
								className={`font-semibold ${match.result === "win" ? "text-red-400" : "text-green-400"}`}
							>
								{match.result === "win" ? "They Won" : "You Won"}
							</div>
						</div>
					))}
				</div>
				<div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
					<div className="text-center">
						<div className="text-white font-semibold mb-1">Overall Record</div>
						<div className="text-cyan-400 font-bold">
							You: {profileUser.overallRecord.wins} -{" "}
							{profileUser.overallRecord.losses} :{" "}
							{profileUser.name.split(" ")[0]}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
