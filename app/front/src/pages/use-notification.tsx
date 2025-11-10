"use client";

import { useEffect, useRef, useState } from "../Miku/src/index";

export interface Notification {
	id: string;
	type:
		| "success"
		| "error"
		| "warning"
		| "info"
		| "game_invite"
		| "tournament_match";
	title: string;
	message: string;
	duration?: number;
	action?: {
		label: string;
		onClick: () => void;
	};
	avatar?: string;
	onAccept?: () => void;
	onReject?: () => void;
	onView?: () => void;
}

const notificationState = {
	notifications: [] as Notification[],
	listeners: [] as Array<(notifications: Notification[]) => void>,
};

export function useNotifications() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const listenerRef = useRef<(notifications: Notification[]) => void>();

	useEffect(() => {
		const listener = (newNotifications: Notification[]) => {
			setNotifications([...newNotifications]);
		};

		listenerRef.current = listener;

		notificationState.listeners.push(listener);

		setNotifications([...notificationState.notifications]);

		return () => {
			const index = notificationState.listeners.indexOf(listener);
			if (index > -1) {
				notificationState.listeners.splice(index, 1);
			}
		};
	}, []);

	const addNotification = (notification: Omit<Notification, "id">) => {
		const id = Math.random().toString(36).substr(2, 9);
		const newNotification: Notification = {
			...notification,
			id,
			duration: notification.duration ?? 5000,
		};

		notificationState.notifications.push(newNotification);

		notificationState.listeners.forEach((listener) => {
			listener(notificationState.notifications);
		});

		if (newNotification.duration && newNotification.duration > 0) {
			setTimeout(() => {
				removeNotification(id);
			}, newNotification.duration);
		}
	};

	const removeNotification = (id: string) => {
		const index = notificationState.notifications.findIndex((n) => n.id === id);
		if (index > -1) {
			notificationState.notifications.splice(index, 1);

			notificationState.listeners.forEach((listener) => {
				listener(notificationState.notifications);
			});
		}
	};

	const clearAll = () => {
		notificationState.notifications.length = 0;

		notificationState.listeners.forEach((listener) => {
			listener(notificationState.notifications);
		});
	};

	return {
		notifications,
		addNotification,
		removeNotification,
		clearAll,
	};
}
