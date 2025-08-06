export const NOTIFICATION_TYPES = {
  MESSAGE: "message",
  FRIEND_REQUEST: "friend_request",
  GAME_INVITE: "game_invite",
  SYSTEM: "system",
};

export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.MESSAGE]: {
    title: "New Message",
    getContent: (data) =>
      `You have a new message from ${data.senderName || "someone"}`,
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    title: "Friend Request",
    getContent: (data) =>
      `${data.senderName || "Someone"} sent you a friend request`,
  },
  [NOTIFICATION_TYPES.GAME_INVITE]: {
    title: "Game Invitation",
    getContent: (data) =>
      `${data.senderName || "Someone"} invited you to play ${
        data.gameName || "a game"
      }`,
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    title: "System Notification",
    getContent: (data) => data.message || "System notification",
  },
};

export const createNotificationData = (type, userId, customData = {}) => {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  return {
    userId,
    type,
    title: customData.title || template.title,
    content: customData.content || template.getContent(customData),
    sourceId: customData.sourceId,
    sourceType: customData.sourceType,
  };
};
