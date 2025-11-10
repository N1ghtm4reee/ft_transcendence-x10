import Miku, { useEffect, useState } from "Miku";
import {
	formatTime,
	getOrCreateConversation,
} from "../../../services/api/chat";
import { API_URL, checkAuthStatus } from "../../../services/api/config";
import {
	acceptFriendRequest,
	declineFriendRequest,
	removeFriend,
	sendFriendRequest,
} from "../../../services/api/friends";
import { sendChallenge } from "../../../services/api/game";
import { searchProfiles } from "../../../services/api/profile";
import { type SocialState, stateManager } from "../../../store/StateManager.ts";
import { ProfileOverview } from "../../../types/profile";
import { useNotifications } from "../../use-notification.tsx";
export default function Friends({
	setActiveSection,
}: {
	setActiveSection: (section: string) => void;
}) {
	const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<ProfileOverview[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(
		null,
	);
	const social = stateManager.getState("social") as SocialState;
	const friendRequests = social.friendRequests.received;
	const friends = social.friends;
	const { addNotification } = useNotifications();

	function handleAddFriends() {
		setShowAddFriendsModal(true);
	}

	function handleCloseModal() {
		setShowAddFriendsModal(false);
		setSearchQuery("");
		setSearchResults([]);
	}

	function handleSearch() {
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
		setIsSearching(false);
	}

	function handleSendFriendRequest({
		userId,
		username,
		avatar,
	}: {
		userId: string;
		username: string;
		avatar: string;
	}) {
		sendFriendRequest(userId, username).catch((error) => {
			console.error("Failed to send friend request:", error);
		});
	}

	function handleRemoveFriend(friendId: string, friendName: string) {
		setShowConfirmRemove(friendId);
	}

	function confirmRemoveFriend() {
		if (showConfirmRemove) {
			removeFriend(showConfirmRemove).catch((error) => {
				console.error("Failed to remove friend:", error);
				addNotification({
					type: "error",
					title: "Error",
					message: "Failed to remove friend",
					duration: 3000,
				});
			});
		}
		setShowConfirmRemove(null);
	}

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
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold text-white">Friends</h2>
				<button
					type="button"
					onClick={handleAddFriends}
					className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:from-orange-600 hover:to-pink-600 transition-all"
				>
					Add Friends
				</button>
			</div>

			{showConfirmRemove && (
				<div className="fixed inset-0  flex items-center justify-center z-50">
					<div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4">
						<h3 className="text-xl font-bold text-white mb-4">Remove Friend</h3>
						<p className="text-gray-300 mb-6">
							Are you sure you want to remove{" "}
							{friends.find((f) => f.id === showConfirmRemove)?.displayName}{" "}
							from your friends list?
						</p>
						<div className="flex space-x-3">
							<button
								onClick={confirmRemoveFriend}
								className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
							>
								Remove
							</button>
							<button
								onClick={() => setShowConfirmRemove(null)}
								className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{showAddFriendsModal && (
				<div className="fixed inset-0 flex items-center justify-center z-50">
					<div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-bold text-white">Add Friends</h3>
							<button
								onClick={handleCloseModal}
								className="text-gray-400 hover:text-white transition-colors text-2xl"
							>
								×
							</button>
						</div>

						<div className="mb-6">
							<div className="relative">
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by username or name..."
									className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
								/>
								<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
									{isSearching ? (
										<div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
									) : (
										<div className="text-gray-400">🔍</div>
									)}
								</div>
							</div>
						</div>

						<div className="max-h-96 overflow-y-auto">
							{searchQuery && searchResults.length === 0 && !isSearching && (
								<div className="text-center py-8">
									<div className="text-4xl mb-2">🔍</div>
									<p className="text-gray-400">
										No users found matching "{searchQuery}"
									</p>
								</div>
							)}

							{!searchQuery && (
								<div className="text-center py-8">
									<p className="text-gray-400">
										Start typing to search for friends
									</p>
								</div>
							)}

							{searchResults.length > 0 && (
								<div className="space-y-3">
									{searchResults.map((user) => {
										const socialState = stateManager.getState(
											"social",
										) as SocialState;
										const isAlreadyFriend = socialState.friends.some(
											(f) => f.id === user.id,
										);
										const isRequestSent = socialState.friendRequests.sent.some(
											(e) => e.user.id === user.id,
										);

										return (
											<div
												key={user.id}
												className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all"
											>
												<div className="flex items-center space-x-3">
													<div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
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
														<h4 className="text-white font-semibold">
															{user.displayName}
														</h4>
														<div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
															<span>
																Rank {user.rank ? `#${user.rank}` : "Unranked"}
															</span>
														</div>
													</div>
												</div>
												<div className="flex items-center space-x-2">
													<div className="text-right text-sm mr-3">
														<div className="text-orange-400 font-bold">
															#{user.rank ? user.rank : "Unranked"}
														</div>
														<div className="text-gray-400">{user.status}</div>
													</div>
													{isAlreadyFriend ? (
														<button
															className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
															disabled
														>
															Already Friends
														</button>
													) : isRequestSent ? (
														<button
															className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
															disabled
														>
															Request Sent
														</button>
													) : (
														<button
															onClick={() =>
																handleSendFriendRequest({
																	userId: user.id,
																	username: user.displayName,
																	avatar: user.avatar,
																})
															}
															className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-pink-600 transition-all"
														>
															Add Friend
														</button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4 flex items-center">
							<span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
							Online Friends (
							{friends.filter((f) => f.status == "online").length})
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{friends
								.filter((friend) => friend.status == "online")
								.map((friend) => (
									<div
										key={friend.id}
										className="bg-gray-700/30 rounded-xl p-4 hover:bg-gray-700/50 transition-all cursor-pointer relative group"
									>
										<button
											onClick={() =>
												handleRemoveFriend(friend.id, friend.displayName)
											}
											className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg"
											title="Remove friend"
										>
											×
										</button>
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center space-x-3">
												<div className="relative">
													<div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
														{friend.avatar ? (
															<img
																src={API_URL + "/" + friend.avatar}
																alt={friend.displayName}
																className="w-full h-full object-cover"
															/>
														) : (
															<span className="text-white font-bold text-sm">
																{friend.displayName
																	.split(" ")
																	.map((n) => n[0])
																	.join("")
																	.substring(0, 2)}
															</span>
														)}
													</div>
													<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
												</div>
												<div>
													<h4 className="text-white font-semibold">
														{friend.displayName}
													</h4>
												</div>
											</div>
											<div className="text-right">
												<div className="text-orange-400 font-bold">
													{friend.rank ? `#${friend.rank}` : "Unranked"}
												</div>
												<div className="text-green-400 text-xs">
													{friend.status}
												</div>
											</div>
										</div>
										<div className="flex justify-between text-sm text-gray-300 mb-3"></div>
										<div className="flex space-x-2">
											<button
												onClick={async () => {
													try {
														const isAuthenticated = await checkAuthStatus();
														if (!isAuthenticated) {
															return;
														}

														await sendChallenge(friend.id);
														console.log(
															`Challenge sent to ${friend.displayName}`,
														);
													} catch (error) {
														console.error("Failed to send challenge:", error);
													}
												}}
												disabled={friend.status !== "online"}
												className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
													friend.status !== "online"
														? "bg-gray-600 text-gray-400 cursor-not-allowed"
														: "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
												}`}
											>
												Challenge
											</button>
											<button
												className="px-3 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-all"
												onClick={() => {
													getOrCreateConversation(friend.id)
														.then((conversation) => {
															if (conversation) {
																setActiveSection("chats");
															}
														})
														.catch((error) => {
															console.error(
																"Failed to create or get conversation:",
																error,
															);
														});
												}}
											>
												💬
											</button>
										</div>
									</div>
								))}
						</div>
					</div>

					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4">
							All Friends ({friends.length})
						</h3>
						<div className="space-y-3">
							{friends.map((friend) => (
								<div
									key={friend.id}
									className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group"
								>
									<div className="flex items-center space-x-3">
										<div className="relative">
											<div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
												{friend.avatar ? (
													<img
														src={API_URL + "/" + friend.avatar}
														alt={friend.displayName}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-white font-bold text-sm">
														{friend.displayName
															.split(" ")
															.map((n) => n[0])
															.join("")
															.substring(0, 2)}
													</span>
												)}
											</div>
											{friend.status == "online" && (
												<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
											)}
										</div>
										<div>
											<h4 className="text-white font-semibold">
												{friend.displayName}
											</h4>
											<p className="text-gray-400 text-sm">
												{friend.status == "online"
													? friend.status
													: `Last seen ${formatTime(
															new Date(friend.lastActive),
														)}`}
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-4">
										<div className="text-right text-sm">
											<div className="text-orange-400 font-bold">
												{friend.rank ? `#${friend.rank}` : "Unranked"}
											</div>
										</div>
										<div className="flex space-x-1">
											<button
												onClick={async () => {
													try {
														const isAuthenticated = await checkAuthStatus();
														if (!isAuthenticated) return;

														await sendChallenge(friend.id);
														console.log(
															`Challenge sent to ${friend.displayName}`,
														);
													} catch (error) {
														console.error("Failed to send challenge:", error);
													}
												}}
												disabled={friend.status !== "online"}
												className={`flex-1 px-3 py-1  rounded-lg text-sm font-semibold transition-all ${
													friend.status !== "online"
														? "bg-gray-600 text-gray-400 cursor-not-allowed"
														: "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
												}`}
											>
												Challenge
											</button>
											<button
												className="px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500 transition-all text-sm"
												onClick={() =>
													getOrCreateConversation(friend.id)
														.then((conversation) => {
															if (conversation) {
																setActiveSection("chats");
															}
														})
														.catch((error) => {
															console.error(
																"Failed to create or get conversation:",
																error,
															);
														})
												}
											>
												💬
											</button>
											<button
												onClick={() =>
													handleRemoveFriend(friend.id, friend.displayName)
												}
												className="px-2 py-1 bg-red-600/80 rounded-lg hover:bg-red-600 transition-all text-sm text-white opacity-0 group-hover:opacity-100"
												title="Remove friend"
											>
												🗑️
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4 flex items-center">
							Friend Requests
							{friendRequests.length > 0 && (
								<span className="ml-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
									{friendRequests.length}
								</span>
							)}
						</h3>
						{friendRequests.length > 0 ? (
							<div className="space-y-4">
								{friendRequests.map((request) => (
									<div
										key={request.user.id}
										className="bg-gray-700/30 rounded-xl p-4"
									>
										<div className="flex items-center space-x-3 mb-3">
											<div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
												{request.user.avatar ? (
													<img
														src={API_URL + "/" + request.user.avatar}
														alt={request.user.displayName}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-white font-bold text-sm">
														{request.user.displayName
															.split(" ")
															.map((n) => n[0])
															.join("")
															.substring(0, 2)}
													</span>
												)}
											</div>
											<div>
												<h4 className="text-white font-semibold">
													{request.user.displayName}
												</h4>
											</div>
										</div>
										<div className="flex space-x-2">
											<button
												className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
												onClick={() => {
													console.log("request user", request);
													acceptFriendRequest(request.id, request.user);
												}}
											>
												Accept
											</button>
											<button
												className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
												onClick={() =>
													declineFriendRequest(request.id, request.user)
												}
											>
												Decline
											</button>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-gray-400">No pending requests</p>
							</div>
						)}
					</div>

					<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
						<h3 className="text-xl font-bold text-white mb-4">Friend Stats</h3>
						<div className="space-y-3">
							<div className="flex justify-between">
								<span className="text-gray-400">Total Friends:</span>
								<span className="text-white font-semibold">
									{friends.length}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Online Now:</span>
								<span className="text-green-400 font-semibold">
									{friends.filter((f) => f.status == "online").length}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">In Game:</span>
								<span className="text-orange-400 font-semibold">
									{
										friends.filter(
											(f) =>
												f.status === "In Game" || f.status === "in Tournament",
										).length
									}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
