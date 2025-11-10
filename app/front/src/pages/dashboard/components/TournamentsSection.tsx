import Miku, { useState } from "Miku";
import { useTournaments, useUserProfile } from "../../../hooks/useStates.ts";
import { sendChallenge } from "../../../services/api/game";
import {
	createTournament,
	getTournamentMatches,
	joinTournament,
	leaveTournament,
	startTournament,
	stopTournament,
} from "../../../services/api/tournament";
import { stateManager } from "../../../store/StateManager";
import { Tournament } from "../../../types/tournament";

export default function TournamentsSection({}) {
	const userProfile = useUserProfile();
	const tournaments = useTournaments();
	console.error(tournaments);
	const loading = tournaments === null;
	const [error, setError] = useState("");
	const [selectedTournament, setSelectedTournament] =
		useState<Tournament | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showBracket, setShowBracket] = useState(false);
	const [showTournamentDetails, setShowTournamentDetails] = useState(false);
	const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
	const [matchesLoading, setMatchesLoading] = useState(false);
	const [activeFilter, setActiveFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(
		null,
	);
	const [leavingTournamentId, setLeavingTournamentId] = useState<string | null>(
		null,
	);

	const [newTournament, setNewTournament] = useState({
		name: "",
		startTime: "",
	});

	const loadTournamentMatches = async (tournamentId: string) => {
		try {
			setMatchesLoading(true);
			const matches = await getTournamentMatches(tournamentId);
			setTournamentMatches(matches);
		} catch (err: any) {
			setError(err.message || "Failed to load tournament matches");
			console.error("Failed to load tournament matches:", err);
		} finally {
			setMatchesLoading(false);
		}
	};

	const handleTournamentChallenge = async (match: any) => {
		if (!userProfile) return;

		try {
			const opponentId =
				match.player1Id === String(userProfile.id)
					? match.player2Id
					: match.player1Id;

			await sendChallenge(opponentId, "tournament", match.id);
		} catch (err: any) {
			setError(err.message || "Failed to send tournament challenge");
			console.error("Failed to send tournament challenge:", err);
		}
	};

	const handleCreateTournament = async () => {
		if (!userProfile || !newTournament.name.trim()) return;

		try {
			const startTime =
				newTournament.startTime || new Date(Date.now() + 60000).toISOString();

			await createTournament({
				name: newTournament.name,
				status: "upcoming",
				startTime: startTime,
				username: userProfile.displayName,
			});

			setNewTournament({ name: "", startTime: "" });
			setShowCreateModal(false);
		} catch (err: any) {
			setError(err.message || "Failed to create tournament");
		}
	};

	const handleRegister = async (tournamentId: string) => {
		if (!userProfile) return;

		setJoiningTournamentId(tournamentId);

		const newPlayer = {
			id: String(userProfile.id),
			userId: String(userProfile.id),
			displayName: userProfile.displayName,
			user: {
				id: String(userProfile.id),
				displayName: userProfile.displayName,
			},
		};

		try {
			stateManager.updateState<any[]>("tournaments", (prev) => {
				if (!prev) return prev;
				return prev.map((t) =>
					t.id === tournamentId
						? {
								...t,
								players: t.players ? [...t.players, newPlayer] : [newPlayer],
								playerCount: (t.playerCount ?? t.players?.length ?? 0) + 1,
							}
						: t,
				);
			});

			const res = await joinTournament(tournamentId, userProfile.displayName);
			if (!res || !res.success) {
				stateManager.updateState<any[]>("tournaments", (prev) => {
					if (!prev) return prev;
					return prev.map((t) =>
						t.id === tournamentId
							? {
									...t,
									players: (t.players || []).filter(
										(p: any) =>
											(p.id ?? p.userId ?? p.user?.id) !==
											String(userProfile.id),
									),
									playerCount: Math.max(
										(t.playerCount ?? t.players?.length ?? 1) - 1,
										0,
									),
								}
							: t,
					);
				});
				setError(res?.error || "Failed to join tournament");
			}
		} catch (err: any) {
			stateManager.updateState<any[]>("tournaments", (prev) => {
				if (!prev) return prev;
				return prev.map((t) =>
					t.id === tournamentId
						? {
								...t,
								players: (t.players || []).filter(
									(p: any) =>
										(p.id ?? p.userId ?? p.user?.id) !== String(userProfile.id),
								),
								playerCount: Math.max(
									(t.playerCount ?? t.players?.length ?? 1) - 1,
									0,
								),
							}
						: t,
				);
			});
			setError(err.message || "Failed to join tournament");
		} finally {
			setJoiningTournamentId(null);
		}
	};

	const handleUnregister = async (tournamentId: string) => {
		if (!userProfile) return;

		setLeavingTournamentId(tournamentId);

		try {
			stateManager.updateState<any[]>("tournaments", (prev) => {
				if (!prev) return prev;
				return prev.map((t) =>
					t.id === tournamentId
						? {
								...t,
								players: (t.players || []).filter(
									(p: any) =>
										(p.id ?? p.userId ?? p.user?.id) !== String(userProfile.id),
								),
								playerCount: Math.max(
									(t.playerCount ?? t.players?.length ?? 1) - 1,
									0,
								),
							}
						: t,
				);
			});

			const res = await leaveTournament(tournamentId);
			if (!res || !res.success) {
				stateManager.updateState<any[]>("tournaments", (prev) => {
					if (!prev) return prev;
					return prev.map((t) =>
						t.id === tournamentId
							? {
									...t,
									players: t.players
										? [
												...t.players,
												{
													id: String(userProfile.id),
													userId: String(userProfile.id),
													displayName: userProfile.displayName,
													user: {
														id: String(userProfile.id),
														displayName: userProfile.displayName,
													},
												},
											]
										: [
												{
													id: String(userProfile.id),
													userId: String(userProfile.id),
													displayName: userProfile.displayName,
													user: {
														id: String(userProfile.id),
														displayName: userProfile.displayName,
													},
												},
											],
									playerCount: (t.playerCount ?? t.players?.length ?? 0) + 1,
								}
							: t,
					);
				});
				setError(res?.error || "Failed to leave tournament");
			}
		} catch (err: any) {
			stateManager.updateState<any[]>("tournaments", (prev) => {
				if (!prev) return prev;
				return prev.map((t) =>
					t.id === tournamentId
						? {
								...t,
								players: t.players
									? [
											...t.players,
											{
												id: String(userProfile.id),
												userId: String(userProfile.id),
												displayName: userProfile.displayName,
												user: {
													id: String(userProfile.id),
													displayName: userProfile.displayName,
												},
											},
										]
									: [
											{
												id: String(userProfile.id),
												userId: String(userProfile.id),
												displayName: userProfile.displayName,
												user: {
													id: String(userProfile.id),
													displayName: userProfile.displayName,
												},
											},
										],
								playerCount: (t.playerCount ?? t.players?.length ?? 0) + 1,
							}
						: t,
				);
			});
			setError(err.message || "Failed to leave tournament");
		} finally {
			setLeavingTournamentId(null);
		}
	};

	const handleStartTournament = async (tournamentId: string) => {
		try {
			await startTournament(tournamentId);
		} catch (err: any) {
			setError(err.message || "Failed to start tournament");
		}
	};

	const handleStopTournament = async (tournamentId: string) => {
		try {
			await stopTournament(tournamentId);
		} catch (err: any) {
			setError(err.message || "Failed to stop tournament");
		}
	};

	const filteredTournaments = tournaments.filter((tournament: Tournament) => {
		const matchesFilter =
			activeFilter === "all" || tournament.status === activeFilter;
		const matchesSearch = tournament.name
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		return matchesFilter && matchesSearch;
	});

	const renderTournamentCard = (tournament: Tournament) => (
		<div
			className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border rounded-2xl p-6 hover:border-orange-500 hover:border-opacity-50 transition-all duration-300 cursor-pointer transform hover:scale-105 border-gray-700"
			onClick={() => {
				setSelectedTournament(tournament);
				setShowTournamentDetails(true);
				loadTournamentMatches(tournament.id);
			}}
		>
			<div className="flex items-start justify-between mb-4">
				<h3 className="text-xl font-bold text-white flex-1 pr-4">
					{tournament.name}
				</h3>
				<span
					className={`px-3 py-1 rounded-full text-black text-xs font-semibold whitespace-nowrap ${
						tournament.status === "started"
							? "bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30"
							: tournament.status === "upcoming"
								? "bg-cyan-500 bg-opacity-20 border border-cyan-500 border-opacity-30"
								: "bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30"
					}`}
				>
					{tournament.status.toUpperCase()}
				</span>
			</div>

			<div className="space-y-3 mb-4 text-sm">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex justify-between">
						<span className="text-gray-400">Players:</span>
						<span className="text-white font-medium">
							{tournament.players?.length ?? tournament.playerCount ?? 0}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-gray-400">Dates:</span>
						<span className="text-green-400 font-semibold">
							{tournament.startDate
								? new Date(tournament.startDate).toLocaleDateString()
								: "TBD"}
						</span>
					</div>
				</div>
			</div>

			<div className="flex gap-2 mt-6" onClick={(e) => e.stopPropagation()}>
				{tournament.createdBy === String(userProfile?.id) && (
					<>
						{tournament.status === "upcoming" &&
							(tournament.players?.length ?? tournament.playerCount ?? 0) >=
								2 && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleStartTournament(tournament.id);
									}}
									className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-semibold"
								>
									Start Tournament
								</button>
							)}
						{(tournament.status === "upcoming" ||
							tournament.status === "started") && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleStopTournament(tournament.id);
								}}
								className="flex-1 py-3 bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30 rounded-xl hover:bg-red-500 hover:bg-opacity-30 transition-all font-semibold"
							>
								Cancel
							</button>
						)}
					</>
				)}

				{tournament.createdBy !== String(userProfile?.id) &&
					tournament.status === "upcoming" && (
						<>
							{tournament.players?.some(
								(p: any) =>
									(p.id ?? p.userId ?? p.user?.id) === String(userProfile?.id),
							) ? (
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleUnregister(tournament.id);
									}}
									className="flex-1 py-3 bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30 rounded-xl hover:bg-red-500 hover:bg-opacity-30 transition-all font-semibold"
									disabled={leavingTournamentId === tournament.id}
								>
									{leavingTournamentId === tournament.id
										? "Leaving..."
										: "Leave"}
								</button>
							) : (
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleRegister(tournament.id);
									}}
									className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={
										joiningTournamentId === tournament.id ||
										(tournament.players?.length ??
											tournament.playerCount ??
											0) >= 9999
									}
								>
									{joiningTournamentId === tournament.id
										? "Joining..."
										: "Join"}
								</button>
							)}
						</>
					)}

				{tournament.status === "started" && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							loadTournamentMatches(tournament.id);
							setSelectedTournament(tournament);
							setShowBracket(true);
						}}
						className="flex-1 py-3 bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30 rounded-xl hover:bg-red-500 hover:bg-opacity-30 transition-all font-semibold"
					>
						Watch Live
					</button>
				)}
			</div>
		</div>
	);

	const renderBracket = () => (
		<div className="fixed inset-0 bg-black  backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-gray-800 bg-opacity-90 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 max-w-6xl w-full max-h-screen overflow-y-auto">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-3xl font-bold text-white">
						{selectedTournament?.status === "started"
							? `${selectedTournament?.name || "Tournament"} (Live)`
							: selectedTournament?.status === "completed"
								? `Results: ${selectedTournament?.name || "Tournament"}`
								: `Tournament Bracket`}
					</h2>
					<button
						onClick={() => setShowBracket(false)}
						className="text-gray-400 hover:text-white transition-colors text-2xl"
					>
						[close]
					</button>
				</div>

				{matchesLoading ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
						<p className="text-white text-lg mt-4">
							Loading tournament data...
						</p>
					</div>
				) : tournamentMatches.length === 0 ? (
					<div className="text-center py-12">
						<h3 className="text-2xl font-bold text-gray-400 mb-2">
							No matches found
						</h3>
						<p className="text-gray-500">
							Tournament matches will appear here once the tournament starts
						</p>
					</div>
				) : (
					<div className="space-y-8">
						{Array.from(new Set(tournamentMatches.map((match) => match.round)))
							.sort((a, b) => a - b)
							.map((round) => {
								const roundMatches = tournamentMatches.filter(
									(match) => match.round === round,
								);
								const getRoundName = (round: number) => {
									const totalRounds = Math.max(
										...tournamentMatches.map((m) => m.round),
									);
									if (totalRounds === 1) return "Finals";
									if (round === totalRounds) return "Finals";
									if (round === totalRounds - 1) return "Semi-Finals";
									return `Round ${round}`;
								};

								return (
									<div key={round}>
										<h3 className="text-xl font-bold text-orange-400 mb-4">
											{getRoundName(round)}
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{roundMatches.map((match) => {
												const player1Name = match.player1?.displayName || "TBD";
												const player2Name = match.player2?.displayName || "TBD";
												const isCompleted =
													match.status === "completed" ||
													match.status === "COMPLETED";

												let scoreDisplay = "";
												if (match.score) {
													try {
														const parsedScore = JSON.parse(match.score);
														scoreDisplay = `${parsedScore.player1 || "0"} - ${parsedScore.player2 || "0"}`;
													} catch {
														scoreDisplay = match.score;
													}
												}

												const hasWinner =
													match.winnerId &&
													(match.winnerId === match.player1Id ||
														match.winnerId === match.player2Id);
												const isActuallyCompleted =
													isCompleted ||
													hasWinner ||
													(match.score && match.score !== "null");

												return (
													<div
														key={match.id}
														className="bg-gray-700 bg-opacity-50 rounded-xl p-4"
													>
														<div className="flex items-center justify-between mb-3">
															<span className="text-orange-400 font-semibold text-sm">
																Match #{match.id.slice(-4)}
															</span>
															{isActuallyCompleted && scoreDisplay && (
																<span className="text-white font-bold bg-gray-800 px-3 py-1 rounded-lg">
																	{scoreDisplay}
																</span>
															)}
														</div>

														<div className="space-y-2">
															<div className="flex items-center justify-between">
																<div className="flex items-center space-x-3">
																	<div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
																		{player1Name.charAt(0).toUpperCase()}
																	</div>
																	<span
																		className={`font-medium ${isActuallyCompleted && match.winnerId === match.player1Id ? "text-green-400 font-bold" : "text-white"}`}
																	>
																		{player1Name}
																		{isActuallyCompleted &&
																			match.winnerId === match.player1Id && (
																				<span className="ml-2">[W]</span>
																			)}
																	</span>
																</div>
															</div>

															<div className="text-center text-gray-400 text-sm font-semibold">
																VS
															</div>

															<div className="flex items-center justify-between">
																<div className="flex items-center space-x-3">
																	<div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
																		{player2Name.charAt(0).toUpperCase()}
																	</div>
																	<span
																		className={`font-medium ${isActuallyCompleted && match.winnerId === match.player2Id ? "text-green-400 font-bold" : "text-white"}`}
																	>
																		{player2Name}
																		{isActuallyCompleted &&
																			match.winnerId === match.player2Id && (
																				<span className="ml-2">[W]</span>
																			)}
																	</span>
																</div>
															</div>
														</div>

														{!isActuallyCompleted &&
															match.status?.toLowerCase() === "pending" &&
															userProfile &&
															(match.player1Id === String(userProfile.id) ||
																match.player2Id === String(userProfile.id)) && (
																<div className="mt-4">
																	<button
																		onClick={() =>
																			handleTournamentChallenge(match)
																		}
																		className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all font-medium"
																	>
																		Challenge
																	</button>
																</div>
															)}
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
					</div>
				)}
			</div>
		</div>
	);

	const renderTournamentDetails = () => {
		if (!showTournamentDetails || !selectedTournament) return null;

		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
				<div className="relative bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-300 dark:border-gray-700">
					<button
						onClick={() => setShowTournamentDetails(false)}
						className="absolute top-4 right-4 text-gray-500 hover:text-blue-500 bg-white/60 dark:bg-gray-800/60 rounded-full p-2 shadow transition-all"
						aria-label="Close"
					>
						<span className="text-2xl font-bold">×</span>
					</button>
					<div className="mb-8 text-center">
						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							{selectedTournament.name}{" "}
							<span className="text-base font-normal text-gray-500 dark:text-gray-400">
								- Matches
							</span>
						</h3>
					</div>
					<div className="space-y-4">
						{matchesLoading ? (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
								<p className="text-gray-500 dark:text-gray-300 mt-4">
									Loading matches...
								</p>
							</div>
						) : tournamentMatches.length > 0 ? (
							<div className="space-y-6">
								{Array.from(
									new Set(tournamentMatches.map((match) => match.round)),
								)
									.sort()
									.map((round) => (
										<div
											key={round}
											className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700"
										>
											<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
												{round === 1
													? "Semi-Finals"
													: round === 2
														? "Finals"
														: `Round ${round}`}
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{tournamentMatches
													.filter((match) => match.round === round)
													.map((match) => (
														<div
															key={match.id}
															className="bg-white/90 dark:bg-gray-900/90 rounded-lg p-4 border border-gray-100 dark:border-gray-800 shadow-sm"
														>
															<div className="flex justify-between items-center mb-3">
																<div className="text-center flex-1">
																	<p className="text-gray-900 dark:text-white font-medium">
																		{match.player1?.displayName || "TBD"}
																	</p>
																</div>
																<div className="px-4 text-gray-400 font-bold">
																	VS
																</div>
																<div className="text-center flex-1">
																	<p className="text-gray-900 dark:text-white font-medium">
																		{match.player2?.displayName || "TBD"}
																	</p>
																</div>
															</div>

															<div className="text-center">
																<p
																	className={`text-sm font-medium mb-2 ${
																		match.status?.toLowerCase() === "completed"
																			? "text-green-500"
																			: match.status?.toLowerCase() ===
																					"in_progress"
																				? "text-yellow-500"
																				: "text-gray-400"
																	}`}
																>
																	{match.status?.toLowerCase() === "completed"
																		? "Completed"
																		: match.status?.toLowerCase() ===
																				"in_progress"
																			? "In Progress"
																			: "Pending"}
																</p>

																{match.status?.toLowerCase() === "pending" &&
																	userProfile &&
																	(match.player1Id === String(userProfile.id) ||
																		match.player2Id ===
																			String(userProfile.id)) && (
																		<button
																			onClick={() =>
																				handleTournamentChallenge(match)
																			}
																			className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all font-medium shadow"
																		>
																			Challenge
																		</button>
																	)}

																{match.status?.toLowerCase() === "completed" &&
																	match.winnerId && (
																		<p className="text-sm text-blue-500">
																			Winner:{" "}
																			{match.winnerId === match.player1Id
																				? match.player1?.displayName
																				: match.player2?.displayName}
																		</p>
																	)}
															</div>
														</div>
													))}
											</div>
										</div>
									))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-gray-500 dark:text-gray-300">
									No matches found for this tournament.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-3xl font-bold text-white">Tournaments</h2>
					<button
						onClick={() => setShowCreateModal(true)}
						className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
					>
						Create Tournament
					</button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 animate-pulse"
						>
							<div className="h-6 bg-gray-700 rounded mb-4"></div>
							<div className="space-y-2">
								<div className="h-4 bg-gray-700 rounded"></div>
								<div className="h-4 bg-gray-700 rounded"></div>
								<div className="h-4 bg-gray-700 rounded"></div>
							</div>
							<div className="h-10 bg-gray-700 rounded mt-4"></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{renderTournamentDetails()}
			{showBracket && renderBracket()}

			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold text-white">Tournaments</h2>
				<button
					onClick={() => setShowCreateModal(true)}
					className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
				>
					Create Tournament
				</button>
			</div>

			<div className="flex flex-col md:flex-row gap-4">
				<div className="flex-1">
					<input
						type="text"
						placeholder="Search tournaments..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
					/>
				</div>

				<div className="flex flex-wrap gap-2 color-black">
					{[
						{ id: "all", label: "All", count: tournaments.length },
						{
							id: "started",
							label: "Live",
							count: tournaments.filter(
								(t: Tournament) => t.status === "started",
							).length,
						},
						{
							id: "upcoming",
							label: "Upcoming",
							count: tournaments.filter(
								(t: Tournament) => t.status === "upcoming",
							).length,
						},
						{
							id: "completed",
							label: "Completed",
							count: tournaments.filter(
								(t: Tournament) => t.status === "completed",
							).length,
						},
					].map((filter) => (
						<button
							key={filter.id}
							onClick={() => setActiveFilter(filter.id)}
							className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
								activeFilter === filter.id
									? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
									: "bg-gray-800 bg-opacity-50 text-gray-400 hover:text-white hover:bg-gray-700 hover:bg-opacity-50"
							}`}
						>
							<span>{filter.label}</span>
							<span className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
								{filter.count}
							</span>
						</button>
					))}
				</div>
			</div>

			{error && (
				<div className="p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-xl text-black">
					{error}
					<button
						onClick={() => setError("")}
						className="ml-4 text-red-300 hover:text-red-100"
					>
						[close]
					</button>
				</div>
			)}

			{filteredTournaments.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredTournaments.map((tournament: Tournament) =>
						renderTournamentCard(tournament),
					)}
				</div>
			) : (
				<div className="text-center py-12">
					<h3 className="text-2xl font-bold text-gray-400 mb-2">
						No tournaments found
					</h3>
					<p className="text-gray-500">
						{tournaments.length === 0
							? "Create your first tournament!"
							: "Try adjusting your search or filters"}
					</p>
				</div>
			)}

			{showCreateModal && (
				<div className="fixed inset-0 backdrop-blur-sm rounded-2xl z-50 flex items-center justify-center p-4">
					<div className="bg-gray-800 bg-opacity-90 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 max-w-md w-full">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-3xl font-bold text-white">
								Create Tournament
							</h2>
							<button
								onClick={() => setShowCreateModal(false)}
								className="text-gray-400 hover:text-white transition-colors text-2xl"
							>
								[close]
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Tournament Name
								</label>
								<input
									type="text"
									value={newTournament.name}
									onChange={(e) =>
										setNewTournament((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
									placeholder="Enter tournament name..."
									className="w-full px-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
								/>
							</div>

							<div className="bg-gray-700 bg-opacity-30 p-4 rounded-xl">
								<h3 className="text-white font-semibold mb-2">
									Tournament Info
								</h3>
								<ul className="text-gray-300 text-sm space-y-1">
									<li>• Maximum 4 players</li>
									<li>• Tournament creator can start when 2+ players join</li>
									<li>• Semifinals → Finals format</li>
									<li>• You'll be automatically registered as a player</li>
								</ul>
							</div>

							<div className="flex gap-3">
								<button
									onClick={() => setShowCreateModal(false)}
									className="flex-1 py-3 bg-gray-600 bg-opacity-50 text-gray-300 rounded-xl hover:bg-gray-600 transition-all font-semibold"
								>
									Cancel
								</button>
								<button
									onClick={handleCreateTournament}
									disabled={!newTournament.name.trim()}
									className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Create Tournament
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
