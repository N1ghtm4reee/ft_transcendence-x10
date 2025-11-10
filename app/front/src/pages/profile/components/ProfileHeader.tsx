import Miku from "Miku";
import { API_URL } from "../../../services/api/config";
import type { ProfileUser } from "./types.ts";

interface ProfileHeaderProps {
	profileUser: ProfileUser;
	isOnline: boolean;
	isFriend: boolean;
	isOwnProfile?: boolean;
	hasPendingRequest?: boolean;
	isBlocked?: boolean;
	onFriendToggle: () => void;
	onChallenge: () => void;
	onMessage: () => void;
	onEditProfile: () => void;
	onBlock: () => void;
}

export default function ProfileHeader({
	profileUser,
	isOnline,
	isFriend,
	isBlocked,
	isOwnProfile = false,
	hasPendingRequest = false,
	onFriendToggle,
	onChallenge,
	onMessage,
	onEditProfile,
	onBlock,
}: ProfileHeaderProps) {
	return (
		<div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 mb-8">
			<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
				<div className="flex items-center space-x-6">
					<div className="relative">
						<div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
							{profileUser.avatar ? (
								<img
									src={API_URL + "/" + profileUser.avatar}
									alt={profileUser.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-white font-bold text-3xl">
									{profileUser.name
										.split(" ")
										.map((n) => n[0])
										.join("")}
								</span>
							)}
						</div>
						{isOnline && (
							<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-gray-800"></div>
						)}
					</div>

					<div>
						<h1 className="text-4xl font-bold text-white mb-2">
							{profileUser.name}
						</h1>
						<p className="text-gray-400 mb-2">{profileUser.username}</p>
						<div className="flex items-center space-x-4 text-sm text-gray-300">
							<span className="flex items-center space-x-1">
								<span></span>
								<span>
									Rank #{profileUser.rank ? profileUser.rank : "Unranked"}
								</span>
							</span>
							<span className="flex items-center space-x-1">
								<span>Joined {profileUser.joinDate}</span>
							</span>
						</div>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row gap-3">
					{!isOwnProfile && (
						<>
							<button
								onClick={onFriendToggle}
								disabled={hasPendingRequest}
								className={`px-6 py-3 rounded-xl font-semibold transition-all ${
									hasPendingRequest
										? "bg-yellow-600/50 text-yellow-200 cursor-not-allowed"
										: isFriend
											? "bg-gray-600 text-white hover:bg-gray-700"
											: "bg-blue-600 text-white hover:bg-blue-700"
								}`}
							>
								{hasPendingRequest
									? "Request Pending"
									: isFriend
										? "Remove Friend"
										: "Add Friend"}
							</button>
							<button
								onClick={onChallenge}
								disabled={!(isFriend && isOnline)}
								className={`px-6 py-3 rounded-xl font-semibold transition-all ${
									!(isFriend && isOnline)
										? "bg-gray-600 text-gray-400 cursor-not-allowed"
										: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
								}`}
							>
								Challenge
							</button>
							<button
								onClick={onBlock}
								disabled={hasPendingRequest}
								aria-pressed={isBlocked}
								className={`px-6 py-3 rounded-xl font-semibold transition-all ${
									hasPendingRequest
										? "bg-yellow-600/50 text-yellow-200 cursor-not-allowed"
										: isBlocked
											? "bg-green-600 text-white hover:bg-green-700"
											: "bg-red-600 text-white hover:bg-red-700"
								}`}
							>
								{isBlocked ? "Unblock" : "Block"}
							</button>
							<button
								onClick={onMessage}
								disabled={!isFriend}
								className={`px-6 py-3 rounded-xl transition-all ${
									isFriend
										? "bg-gray-700 text-white hover:bg-gray-600"
										: "bg-gray-700/50 text-gray-400 cursor-not-allowed"
								}`}
								title={
									!isFriend
										? "You must be friends to send messages"
										: "Send a message"
								}
							>
								Message
							</button>
						</>
					)}
					{isOwnProfile && (
						<button
							onClick={onEditProfile}
							className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
						>
							Edit Profile
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
