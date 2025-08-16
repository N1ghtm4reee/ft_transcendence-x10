export const notificationSchemas = {
  createNotificationSchema: {
    body: {
      type: "object",
      required: ["userId", "type", "title", "content"],
      properties: {
        userId: { type: "number" },
        type: {
          type: "string",
          enum: [
            "FRIEND_REQUEST_RECEIVED",
            "FRIEND_REQUEST_ACCEPTED",
            "FRIEND_REQUEST_DECLINED",
            "system",
          ],
        },
        title: { type: "string" },
        content: { type: "string" },
        sourceId: { type: "string" },
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
};
