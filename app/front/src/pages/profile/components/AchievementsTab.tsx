import Miku from "Miku";
import type { UserAchievement } from "./types.ts";

interface AchievementsTabProps {
	achievements: UserAchievement[];
}

export default function AchievementsTab({
	achievements,
}: AchievementsTabProps) {
	return (
		<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
			<h3 className="text-xl font-bold text-white mb-6">Achievements</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{achievements.map((achievement, index) => (
					<div
						key={index}
						className={`p-4 rounded-xl border transition-all ${
							achievement.unlocked
								? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50"
								: "bg-gray-700/30 border-gray-600 opacity-50"
						}`}
					>
						<div
							className={`text-3xl mb-2 ${achievement.unlocked ? "" : "grayscale"}`}
						>
							{achievement.icon}
						</div>
						<h4
							className={`font-semibold mb-1 ${achievement.unlocked ? "text-white" : "text-gray-400"}`}
						>
							{achievement.name}
						</h4>
						<p className="text-gray-400 text-sm">{achievement.description}</p>
					</div>
				))}
			</div>
		</div>
	);
}
