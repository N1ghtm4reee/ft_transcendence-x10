export const NOTIFICATION_TYPES = {
  MESSAGE: "message",
  FRIEND_REQUEST: "friend_request",
  GAME_INVITE: "game_invite",
  TOURNAMENT_MATCH: "tournament_match",
  TOURNAMENT_UPDATE: "tournament_update",
  TOURNAMENT_CREATED: "TOURNAMENT_CREATED",
  TOURNAMENT_JOINED: "TOURNAMENT_JOINED",
  TOURNAMENT_LEFT: "TOURNAMENT_LEFT",
  TOURNAMENT_STARTED: "TOURNAMENT_STARTED",
  TOURNAMENT_CANCELLED: "TOURNAMENT_CANCELLED",
  TOURNAMENT_MATCH_READY: "TOURNAMENT_MATCH_READY",
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
  [NOTIFICATION_TYPES.TOURNAMENT_MATCH]: {
    title: "Tournament Match Ready",
    getContent: (data) =>
      `Your tournament match is ready! Face off against ${
        data.opponentName || "your opponent"
      } in ${data.tournamentName || "the tournament"}`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_UPDATE]: {
    title: "Tournament Update",
    getContent: (data) => data.message || "Tournament status has been updated",
  },
  [NOTIFICATION_TYPES.TOURNAMENT_CREATED]: {
    title: "Tournament Created",
    getContent: (data) =>
      `New tournament "${data.tournamentName}" has been created by ${
        data.creatorName || "someone"
      }`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_JOINED]: {
    title: "Player Joined Tournament",
    getContent: (data) =>
      `${data.playerName || "Someone"} joined tournament "${
        data.tournamentName || "the tournament"
      }"`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_LEFT]: {
    title: "Player Left Tournament",
    getContent: (data) =>
      `${data.playerName || "Someone"} left tournament "${
        data.tournamentName || "the tournament"
      }"`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_STARTED]: {
    title: "Tournament Started",
    getContent: (data) =>
      `Tournament "${data.tournamentName || "the tournament"}" has started!`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_CANCELLED]: {
    title: "Tournament Cancelled",
    getContent: (data) =>
      `Tournament "${
        data.tournamentName || "the tournament"
      }" has been cancelled`,
  },
  [NOTIFICATION_TYPES.TOURNAMENT_MATCH_READY]: {
    title: "Tournament Match Ready",
    getContent: (data) =>
      `Your tournament match is ready! Face off against ${
        data.opponentName || "your opponent"
      } in ${data.tournamentName || "the tournament"}`,
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
