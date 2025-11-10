import Miku, { useEffect, useRef, useState } from "Miku";
import { useMessages, useUserProfile } from "../../../hooks/useStates.ts";
import { formatTime, sendMessage } from "../../../services/api/chat";
import { API_URL } from "../../../services/api/config";
import { sendChallenge } from "../../../services/api/game";
import { stateManager } from "../../../store/StateManager.ts";
import { Conversation, Message } from "../../../types/message";
import { ProfileOverview } from "../../../types/profile";

export default function ChatsSection() {
	const messagesState = useMessages();
	const currentUser = useUserProfile();

	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [newMessage, setNewMessage] = useState("");
	console.log(newMessage);
	const [isLoading, setIsLoading] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const input_ref = useRef<HTMLInputElement | null>(null);
	const conversations = messagesState?.conversations || [];
	console.log("Conversations: ", conversations);
	const selectedConversation = conversations.find(
		(conv) => conv.id === selectedConversationId,
	);

	useEffect(() => {
		const activeChat = messagesState?.activeChat;

		if (conversations.length > 0 && !isInitialized) {
			const targetConversationId =
				activeChat && conversations.find((conv) => conv.id === activeChat)
					? activeChat
					: conversations[0].id;

			setSelectedConversationId(targetConversationId);
			setIsInitialized(true);

			if (activeChat && messagesState) {
				const { activeChat: _, ...restMessagesState } = messagesState;
				stateManager.setState("messages", {
					...restMessagesState,
					activeChat: undefined,
				});
			}
		} else if (
			conversations.length > 0 &&
			messagesState?.activeChat &&
			!selectedConversationId
		) {
			const targetConversation = conversations.find(
				(conv) => conv.id === messagesState.activeChat,
			);
			if (targetConversation) {
				setSelectedConversationId(targetConversation.id);
				const { activeChat: _, ...restMessagesState } = messagesState;
				stateManager.setState("messages", {
					...restMessagesState,
					activeChat: undefined,
				});
			}
		}
	}, [conversations, selectedConversationId, isInitialized, messagesState]);

	const handleConversationSelect = (conversationId: string) => {
		setSelectedConversationId(conversationId);
	};
	const handleSendMessage = async (e: any) => {
		if (
			!newMessage.trim() ||
			!selectedConversationId ||
			isLoading ||
			!currentUser
		)
			return;
		if (!selectedConversation) return;
		setIsLoading(true);
		try {
			const receiverId = selectedConversation.members.find(
				(e) => e.id !== currentUser.id,
			)?.id;
			if (!receiverId) return;
			await sendMessage(receiverId, newMessage);
			setNewMessage("");
			if (input_ref.current) {
				input_ref.current.value = "";
			}
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage(e);
		}
	};

	const getOtherMember = (
		conversation: Conversation,
	): ProfileOverview | null => {
		if (!currentUser) return null;
		return (
			conversation.members.find((member) => member.id !== currentUser.id) ||
			null
		);
	};

	const isMessageFromCurrentUser = (message: Message): boolean => {
		return currentUser ? message.senderId === currentUser.id : false;
	};

	if (!currentUser) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-3xl font-bold text-white">Messages</h2>
				</div>
				<div className="flex items-center justify-center h-64 text-gray-400">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
						<p>Loading messages...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold text-white">Messages</h2>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto">
					{conversations.length === 0 ? (
						<div className="text-center text-gray-400 py-8">
							<p>No conversations yet</p>
							<p className="text-sm">Start a new chat to begin messaging</p>
						</div>
					) : (
						conversations.map((conversation) => {
							const otherMember = getOtherMember(conversation);
							if (!otherMember) return null;
							return (
								<div
									onClick={() => handleConversationSelect(conversation.id)}
									className={`bg-gray-800/50 backdrop-blur-lg border rounded-2xl p-4 transition-all cursor-pointer transform hover:scale-[1.02] ${
										selectedConversationId === conversation.id
											? "border-cyan-500/70 bg-gray-800/70 shadow-lg shadow-cyan-500/20"
											: "border-gray-700 hover:border-cyan-500/50"
									}`}
								>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center space-x-3">
											<div className="relative">
												<div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
													{otherMember.avatar ? (
														<img
															src={`${API_URL}/${otherMember.avatar}`}
															alt={otherMember.displayName}
															className="w-full h-full object-cover"
														/>
													) : (
														<span className="text-white font-bold text-sm">
															{otherMember.displayName
																.split(" ")
																.map((n) => n[0])
																.join("")
																.substring(0, 2)}
														</span>
													)}
												</div>
												{otherMember.status === "online" && (
													<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
												)}
											</div>
											<div>
												<h3 className="text-white font-semibold">
													{otherMember.displayName}
												</h3>
												<p className="text-gray-400 text-sm">
													{conversation.lastMessage
														? formatTime(conversation.lastMessage.createdAt)
														: "No messages"}
												</p>
											</div>
										</div>
										{conversation.unreadCount > 0 && (
											<div className="bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
												{conversation.unreadCount}
											</div>
										)}
									</div>
									<p
										className="text-gray-300 text-sm truncate"
										key={conversation.id}
									>
										{conversation.lastMessage
											? conversation.lastMessage.content
											: "No messages yet"}
									</p>
								</div>
							);
						})
					)}
				</div>

				<div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6">
					{selectedConversation ? (
						<>
							<div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
								<div className="flex items-center space-x-3">
									{(() => {
										const otherMember = getOtherMember(selectedConversation);
										if (!otherMember) return null;
										return (
											<>
												<div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
													{otherMember.avatar ? (
														<img
															src={`${API_URL}/${otherMember.avatar}`}
															alt={otherMember.displayName}
															className="w-full h-full object-cover"
														/>
													) : (
														<span className="text-white font-bold text-sm">
															{otherMember.displayName
																.split(" ")
																.map((n) => n[0])
																.join("")
																.substring(0, 2)}
														</span>
													)}
												</div>
												<div>
													<h3 className="text-white font-semibold">
														{otherMember.displayName}
													</h3>
													<p
														className={`text-sm ${otherMember.status === "online" ? "text-green-400" : "text-gray-400"}`}
													>
														{otherMember.status === "online"
															? "Online"
															: "Offline"}
													</p>
												</div>
											</>
										);
									})()}
								</div>
								<div className="flex space-x-2">
									<button
										className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 rounded-xl text-sm font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
										onClick={() =>
											sendChallenge(
												selectedConversation.members.find(
													(e) => e.id !== currentUser.id,
												)?.id || "",
											)
										}
									>
										Challenge
									</button>
								</div>
							</div>

							<div className="space-y-4 mb-6 h-64 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-cyan-500">
								{selectedConversation.messages.length === 0 ? (
									<div className="flex items-center justify-center h-full text-gray-400">
										<p>No messages yet. Start the conversation!</p>
									</div>
								) : (
									selectedConversation.messages.map((message) => (
										<div
											key={message.id}
											className={`flex ${isMessageFromCurrentUser(message) ? "justify-end" : "justify-start"}`}
										>
											<div
												className={`px-4 py-2 rounded-2xl max-w-xs ${
													isMessageFromCurrentUser(message)
														? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-sm"
														: "bg-gray-700 text-white rounded-bl-sm"
												}`}
											>
												<p>{message.content}</p>
												<p className="text-xs opacity-70 mt-1">
													{formatTime(message.createdAt)}
												</p>
											</div>
										</div>
									))
								)}
							</div>

							<div className="flex space-x-3">
								<input
									type="text"
									value={newMessage}
									onChange={(e) => setNewMessage(e.target.value)}
									onKeyDown={handleKeyPress}
									placeholder="Type a message..."
									className="flex-1 bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
									disabled={isLoading}
									ref={input_ref}
								/>
								<button
									onClick={handleSendMessage}
									className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
									disabled={!newMessage.trim() || isLoading}
								>
									{isLoading ? "Sending..." : "Send"}
								</button>
							</div>
						</>
					) : (
						<div className="flex items-center justify-center h-full text-gray-400">
							<div className="text-center">
								<p className="text-lg mb-2">
									Select a conversation to start messaging
								</p>
								<p className="text-sm">
									Choose from your conversations on the left
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
