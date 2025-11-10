import { Link } from "Miku/Router";
import Miku, { useEffect, useState } from "../Miku/src/index";
import { API_URL } from "../services/api/config";
import { sendFriendRequest } from "../services/api/friends";
import { searchProfiles } from "../services/api/profile";
import { type UserProfileState } from "../store/StateManager.ts";
import { ProfileOverview } from "../types/profile";

interface UniversalHeaderProps {
	profile: UserProfileState | null;
	onlineUsers: number;
	onLogout?: () => void;
	onProfileClick?: () => void;
}

export default function fUniversalHeader({
	profile,
	onlineUsers,
	onLogout,
}: UniversalHeaderProps) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<ProfileOverview[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showSearchResults, setShowSearchResults] = useState(false);

	const handleLogout = () => {
		setDropdownOpen(false);
		onLogout?.();
	};

	const handleSearch = () => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);

		searchProfiles(searchQuery)
			.then((profiles) => {
				setSearchResults(profiles);
			})
			.catch((error) => {
				console.error("Failed to search profiles:", error);
			})
			.finally(() => {
				setIsSearching(false);
			});
	};

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (searchQuery) {
				handleSearch();
			} else {
				setSearchResults([]);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	return (
		<header className="relative z-50 px-6 py-4 border-b border-gray-700/50">
			<div className="max-w-7xl mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Link
						to="/dashboard"
						className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
					>
						<div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
							<img src="./miku-icon.png"></img>
						</div>
						<span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
							Miku
						</span>
					</Link>

					{/* Search Bar with Results */}
					<div className="relative ml-6">
						<div className="relative">
							<input
								type="text"
								placeholder="Search friends..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setShowSearchResults(true);
								}}
								onFocus={() => setShowSearchResults(true)}
								className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all w-64"
							/>
							<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
								{isSearching ? (
									<div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
								) : (
									<div className="text-gray-400">🔍</div>
								)}
							</div>
						</div>

						{/* Search Results Dropdown */}
						{showSearchResults && searchQuery && (
							<>
								{/* Overlay to close results when clicking outside */}
								<div
									className="fixed inset-0 z-40"
									onClick={() => setShowSearchResults(false)}
								/>

								{/* Results dropdown */}
								<div className="absolute left-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-cyan-500/30 z-50 max-h-96 overflow-y-auto">
									{searchResults.length === 0 && !isSearching && (
										<div className="text-center py-6">
											<div className="text-2xl mb-2">🔍</div>
											<p className="text-gray-400 text-sm">
												No users found matching "{searchQuery}"
											</p>
										</div>
									)}

									{searchResults.length > 0 && (
										<div className="py-2">
											{searchResults.map((user) => {
												return (
													<div
														key={user.id}
														className="flex items-center justify-between px-4 py-3 hover:bg-cyan-600/20 transition-colors"
													>
														<Link
															to={"/profile/" + user.displayName}
															className=""
														>
															<div className="flex items-center space-x-3">
																<div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
																	{user.avatar ? (
																		<img
																			src={API_URL + "/" + user.avatar}
																			alt={user.displayName}
																			className="w-full h-full object-cover"
																		/>
																	) : (
																		<span className="text-white font-bold text-sm">
																			{user.displayName
																				.split(" ")
																				.map((n) => n[0])
																				.join("")
																				.substring(0, 2)}
																		</span>
																	)}
																</div>
																<div>
																	<h4 className="text-white font-semibold text-sm">
																		{user.displayName}
																	</h4>
																	<div className="flex items-center space-x-2 text-xs text-gray-400">
																		<span>Rank #{user.rank}</span>
																		<span>•</span>
																		<span>{user.status}</span>
																	</div>
																</div>
															</div>
														</Link>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex items-center space-x-6">
					<div className="flex items-center space-x-2 text-gray-300">
						<div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
						<span className="text-sm">
							{onlineUsers.toLocaleString()} online
						</span>
					</div>

					<div className="relative">
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className="flex items-center space-x-3 hover:bg-cyan-800/30 rounded-lg px-2 py-1 transition-colors"
						>
							<div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
								{profile?.avatar ? (
									<img
										src={API_URL + "/" + profile.avatar}
										alt="Avatar"
										className="w-8 h-8 rounded-full object-cover"
									/>
								) : (
									<span className="text-white font-bold text-sm"></span>
								)}
							</div>
							<span className="text-white font-semibold">
								{profile?.displayName || "John Doe"}
							</span>
							<svg
								className={`w-4 h-4 text-cyan-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>

						{dropdownOpen && (
							<>
								{/* Overlay to close dropdown when clicking outside */}
								<div
									className="fixed inset-0 z-40"
									onClick={() => setDropdownOpen(false)}
								/>

								{/* Dropdown menu */}
								<div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-cyan-500/30 z-50">
									<div className="py-1">
										<Link
											to={"/profile/" + profile?.displayName}
											className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors flex items-center space-x-2"
										>
											<span></span>
											<span>Profile</span>
										</Link>
										<hr className="border-cyan-500/30 my-1" />
										<button
											onClick={handleLogout}
											className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors flex items-center space-x-2"
										>
											<span></span>
											<span>Logout</span>
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
