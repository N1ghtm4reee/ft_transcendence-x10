import { notificationControllers } from "../controllers/notification.controller.js";
import { notificationSchemas } from "../schemas/notification.schema.js";

export const notificationRoutes = async (app, options) => {
  app.post("/", {
    handler: notificationControllers.createNotification,
  });

  app.get("/", {
    schema: notificationSchemas.getUserNotificationsSchema,
    handler: notificationControllers.getUserNotifications,
  });

  app.patch("/:notificationId/read", {
    schema: notificationSchemas.markAsReadSchema,
    handler: notificationControllers.markAsRead,
  });

  app.patch("/read-all", {
    schema: { headers: notificationSchemas.getUserNotificationsSchema.headers },
    handler: notificationControllers.markAllAsRead,
  });

  app.get("/unread-count", {
    schema: { headers: notificationSchemas.getUserNotificationsSchema.headers },
    handler: notificationControllers.getUnreadCount,
  });

  app.get("/user/:userId/online", {
    schema: {
      params: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string" },
        },
      },
    },
    handler: notificationControllers.isUserOnline,
  });

  app.get("/users/online", {
    handler: notificationControllers.getOnlineUsers,
  });
};

export const notificationSocket = async (app) => {
  app.get(
    "/live",
    { websocket: true },
    notificationControllers.liveNotifications
  );
};
