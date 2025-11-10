import Miku, { useEffect, useRef, useState } from "../Miku/src/index";
import type { Props } from "../Miku/src/types/types";
import { API_URL } from "../services/api/config";
import { type Notification, useNotifications } from "./use-notification.tsx";

const NotificationToast = ({
	notification,
}: { notification: Notification } & Props) => {
	const [isVisible, setIsVisible] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);
	const { removeNotification } = useNotifications();
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => setIsVisible(true), 50);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (notification.duration && notification.duration > 0) {
			timeoutRef.current = setTimeout(() => {
				handleClose();
			}, notification.duration);
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [notification.duration]);

	const handleClose = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setIsLeaving(true);
		setTimeout(() => {
			removeNotification(notification.id);
		}, 300);
	};

	const handleAccept = () => {
		if (notification.onAccept) {
			notification.onAccept();
		}
		handleClose();
	};

	const handleReject = () => {
		if (notification.onReject) {
			notification.onReject();
		}
		handleClose();
	};

	console.info(notification.duration);

	const getIcon = () => {
		switch (notification.type) {
			case "success":
				return "[success]";
			case "error":
				return "[error]";
			case "warning":
				return "[warning]";
			case "info":
				return "[info]";
			case "game_invite":
				return "[game]";
			case "tournament_match":
				return "[tournament]";
			default:
				return "[info]";
		}
	};

	const getColors = () => {
		switch (notification.type) {
			case "success":
				return "border-green-500/50 bg-green-500/10 text-green-400";
			case "error":
				return "border-red-500/50 bg-red-500/10 text-red-400";
			case "warning":
				return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
			case "info":
				return "border-blue-500/50 bg-blue-500/10 text-blue-400";
			case "game_invite":
				return "border-cyan-500/50 bg-cyan-500/10 text-cyan-400";
			case "tournament_match":
				return "border-cyan-500/50 bg-cyan-500/10 text-cyan-400";
			default:
				return "border-gray-500/50 bg-gray-500/10 text-gray-400";
		}
	};

	return (
		<div
			className={`
          transform transition-all duration-300 ease-in-out
          ${
						isVisible && !isLeaving
							? "translate-x-0 opacity-100"
							: "translate-x-full opacity-0"
					}
          ${getColors()}
          bg-gray-800/90 backdrop-blur-lg border rounded-xl p-4 shadow-2xl
          max-w-sm w-full pointer-events-auto z-100
        `}
		>
			<div className="flex items-start space-x-3">
				{notification.avatar ? (
					<div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
						<img
							src={API_URL + "/" + notification.avatar}
							className="w-full h-full object-cover"
							alt="Avatar"
						/>
					</div>
				) : (
					<div className="text-xl flex-shrink-0 mt-0.5">{getIcon()}</div>
				)}

				<div className="flex-1 min-w-0">
					<h4 className="text-white font-semibold text-sm">
						{notification.title}
					</h4>
					{notification.message && (
						<p className="text-gray-300 text-sm mt-1 leading-relaxed">
							{notification.message}
						</p>
					)}

					{notification.type === "game_invite" ? (
						<div className="flex space-x-2 mt-3">
							<button
								onClick={handleAccept}
								className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
							>
								Accept
							</button>
							<button
								onClick={handleReject}
								className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
							>
								Reject
							</button>
						</div>
					) : notification.type === "tournament_match" ? (
						<div className="flex space-x-2 mt-3">
							<button
								onClick={handleAccept}
								className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
							>
								Start Match
							</button>
							<button
								onClick={handleReject}
								className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
							>
								View Tournament
							</button>
						</div>
					) : (
						notification.action && (
							<button
								onClick={notification.action.onClick}
								className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors"
							>
								{notification.action.label}
							</button>
						)
					)}
				</div>

				<button
					onClick={handleClose}
					className="text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"
				>
					<span className="text-lg">×</span>
				</button>
			</div>
		</div>
	);
};

export function NotificationContainer() {
	const { notifications } = useNotifications();

	return (
		<div className="fixed top-4 right-4 z-100 space-y-3 pointer-events-none ">
			{notifications &&
				notifications.map((notification) => (
					<NotificationToast
						key={notification.id}
						notification={notification}
					/>
				))}
		</div>
	);
}
