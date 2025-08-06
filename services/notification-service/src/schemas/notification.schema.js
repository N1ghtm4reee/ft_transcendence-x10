export const notificationSchemas = {
  createNotificationSchema: {
    body: {
      type: "object",
      required: ["userId", "type", "title", "content"],
      properties: {
        userId: { type: "number" },
        type: {
          type: "string",
          enum: ["message", "friend_request", "game_invite", "system"],
        },
        title: { type: "string" },
        content: { type: "string" },
        sourceId: { type: "string" },
        sourceType: { type: "string" },
      },
    },
  },

  getUserNotificationsSchema: {
    headers: {
      type: "object",
      required: ["x-user-id"],
      properties: {
        "x-user-id": { type: "number" },
      },
    },
    querystring: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
        offset: { type: "number", default: 0 },
        unreadOnly: { type: "boolean", default: false },
      },
    },
  },

  markAsReadSchema: {
    params: {
      type: "object",
      required: ["notificationId"],
      properties: {
        notificationId: { type: "string" },
      },
    },
    headers: {
      type: "object",
      required: ["x-user-id"],
      properties: {
        "x-user-id": { type: "number" },
      },
    },
  },

  updateSettingsSchema: {
    headers: {
      type: "object",
      required: ["x-user-id"],
      properties: {
        "x-user-id": { type: "number" },
      },
    },
    body: {
      type: "object",
      properties: {
        enableMessages: { type: "boolean" },
        enableFriendRequests: { type: "boolean" },
        enableGameInvites: { type: "boolean" },
        enableSystemAlerts: { type: "boolean" },
        enableRealTime: { type: "boolean" },
        enableEmail: { type: "boolean" },
        enablePush: { type: "boolean" },
      },
    },
  },
};
