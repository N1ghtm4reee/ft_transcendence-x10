import Miku from "Miku";
import type { Match } from "./types";

interface MatchesTabProps {
	recentMatches: Match[];
}

export default function MatchesTab({ recentMatches }: MatchesTabProps) {
	return (
		<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
			<h3 className="text-xl font-bold text-white mb-6">Recent Matches</h3>
			<div className="space-y-4">
				{recentMatches.map((match) => (
					<div
						key={match.id}
						className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all"
					>
						<div className="flex items-center space-x-4">
							<div
								className={`w-4 h-4 rounded-full ${match.result === "win" ? "bg-green-500" : "bg-red-500"}`}
							></div>
							<div>
								<div className="text-white font-semibold">
									vs {match.opponent}
								</div>
								<div className="text-gray-400 text-sm">{match.score}</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-gray-400 text-sm">{match.time}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
