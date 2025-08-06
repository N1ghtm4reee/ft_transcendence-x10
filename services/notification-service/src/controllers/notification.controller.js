import { prisma } from "../config/database.js";

const socketConnections = new Map();

// send socket message to user that received a message
function broadcastToUser(userId, data) {
  const userConnections = socketConnections.get(parseInt(userId));
  if (userConnections && userConnections.size > 0) {
    console.log(
      `Broadcasting to ${userConnections.size} connections for user ${userId}:`,
      data
    );

    userConnections.forEach((connection) => {
      if (connection.readyState === 1) {
        try {
          connection.send(
            JSON.stringify({
              type: "notification",
              data: data,
            })
          );
          console.log(`Notification sent to user ${userId}`);
        } catch (error) {
          console.error(
            ` Error sending notification to user ${userId}:`,
            error
          );
          userConnections.delete(connection);
        }
      } else {
        console.log(`Removing closed connection for user ${userId}`);
        userConnections.delete(connection);
      }
    });

    if (userConnections.size === 0) {
      socketConnections.delete(parseInt(userId));
    }
  } else {
    console.log(
      `No active connections for user ${userId} - notification stored but not broadcast`
    );
  }
}

// ?
async function shouldSendNotification(userId, notificationType) {
  try {
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      await prisma.notificationSettings.create({
        data: { userId },
      });
      return true;
    }

    switch (notificationType) {
      case "message":
        return settings.enableMessages;
      case "friend_request":
        return settings.enableFriendRequests;
      case "game_invite":
        return settings.enableGameInvites;
      case "system":
        return settings.enableSystemAlerts;
      default:
        return true;
    }
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return true;
  }
}

export const notificationControllers = {
  // post route to create notification e.g (when user sends a message to another user)
  createNotification: async (req, res) => {
    try {
      const { userId, type, title, content, sourceId, sourceType } = req.body;

      const shouldSend = await shouldSendNotification(userId, type);
      if (!shouldSend) {
        return res
          .code(200)
          .send({ message: "Notification not sent due to user preferences" });
      }

      const notification = await prisma.notification.create({
        data: {
          userId: parseInt(userId),
          type,
          title,
          content,
          sourceId,
          sourceType,
        },
      });

      const notificationData = {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        read: notification.read,
        createdAt: notification.createdAt,
        sourceId: notification.sourceId,
        sourceType: notification.sourceType,
      };

      // we should broadcast to user instantly
      broadcastToUser(notification.userId, notificationData);

      return res.code(201).send({
        message: "Notification created successfully",
        notification: notificationData,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      return res.code(500).send({
        error: "Failed to create notification",
        details: error.message,
      });
    }
  },

  getUserNotifications: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);
      const { limit = 20, offset = 0, unreadOnly = false } = req.query;

      const whereClause = {
        userId: userId,
      };

      if (unreadOnly === "true" || unreadOnly === true) {
        whereClause.read = false;
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          read: true,
          createdAt: true,
          sourceId: true,
          sourceType: true,
        },
      });

      const totalCount = await prisma.notification.count({
        where: whereClause,
      });

      return res.send({
        notifications,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.code(500).send({
        error: "Failed to fetch notifications",
        details: error.message,
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);
      const { notificationId } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      if (!notification) {
        return res.code(404).send({ error: "Notification not found" });
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      const updateData = {
        type: "notification_read",
        notificationId: notificationId,
        userId: userId,
        read: true,
      };

      broadcastToUser(userId, updateData);

      return res.send({
        message: "Notification marked as read",
        notification: updatedNotification,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.code(500).send({
        error: "Failed to mark notification as read",
        details: error.message,
      });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);

      const updateResult = await prisma.notification.updateMany({
        where: {
          userId: userId,
          read: false,
        },
        data: { read: true },
      });

      const updateData = {
        type: "all_notifications_read",
        userId: userId,
        updatedCount: updateResult.count,
      };
      broadcastToUser(userId, updateData);

      return res.send({
        message: "All notifications marked as read",
        updatedCount: updateResult.count,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.code(500).send({
        error: "Failed to mark all notifications as read",
        details: error.message,
      });
    }
  },

  getSettings: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);

      let settings = await prisma.notificationSettings.findUnique({
        where: { userId: userId },
      });

      if (!settings) {
        settings = await prisma.notificationSettings.create({
          data: { userId: userId },
        });
      }

      return res.send({ settings });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      return res.code(500).send({
        error: "Failed to fetch notification settings",
        details: error.message,
      });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);
      const updateData = req.body;

      const allowedFields = [
        "enableMessages",
        "enableFriendRequests",
        "enableGameInvites",
        "enableSystemAlerts",
        "enableRealTime",
        "enableEmail",
        "enablePush",
      ];

      const filteredUpdateData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      const settings = await prisma.notificationSettings.upsert({
        where: { userId: userId },
        update: filteredUpdateData,
        create: {
          userId: userId,
          ...filteredUpdateData,
        },
      });

      return res.send({
        message: "Notification settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      return res.code(500).send({
        error: "Failed to update notification settings",
        details: error.message,
      });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"]);

      const unreadCount = await prisma.notification.count({
        where: {
          userId: userId,
          read: false,
        },
      });

      return res.send({ count: unreadCount });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      return res.code(500).send({
        error: "Failed to fetch unread notification count",
        details: error.message,
      });
    }
  },

  // Check if a specific user is online
  isUserOnline: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userConnections = socketConnections.get(userId);
      const isOnline = userConnections && userConnections.size > 0;

      return res.send({
        userId: userId,
        online: isOnline,
        connections: isOnline ? userConnections.size : 0,
        timestamp: new Date().toISOString(), // dyalach ?
      });
    } catch (error) {
      console.error("Error checking user online status:", error);
      return res.code(500).send({
        error: "Failed to check user online status",
        details: error.message,
      });
    }
  },

  // Get all online users
  getOnlineUsers: async (req, res) => {
    try {
      const onlineUsers = [];
      socketConnections.forEach((connections, userId) => {
        if (connections.size > 0) {
          onlineUsers.push({
            userId: userId,
            connections: connections.size,
          });
        }
      });

      return res.send({
        onlineUsers: onlineUsers,
        totalOnline: onlineUsers.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting online users:", error);
      return res.code(500).send({
        error: "Failed to get online users",
        details: error.message,
      });
    }
  },
  // 
  liveNotifications: async (connection, req) => {
    const userId = parseInt(req.query.userId);

    if (!userId) {
      console.error("No userId provided in WebSocket connection");
      connection.socket.close(1008, "Missing userId parameter");
      return;
    }

    if (!socketConnections.has(userId)) {
      socketConnections.set(userId, new Set());
    }

    socketConnections.get(userId).add(connection.socket);
    console.log(
      `User ${userId} connected to live notifications. Total connections: ${
        socketConnections.get(userId).size
      }`
    );

    try {
      connection.socket.send(
        JSON.stringify({
          type: "connection_status",
          data: {
            status: "connected",
            userId: userId,
            message: "Successfully connected to live notifications",
          },
        })
      );
      console.log(`Connection confirmation sent to user ${userId}`);
    } catch (error) {
      console.error(
        `Error sending connection confirmation to user ${userId}:`,
        error
      );
    }

    connection.socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Message from user ${userId}:`, data);

        switch (data.type) {
          case "ping":
            connection.socket.send(
              JSON.stringify({ type: "pong", timestamp: Date.now() })
            );
            break;
          case "subscribe":
            connection.socket.send(
              JSON.stringify({
                type: "subscription_status",
                data: { subscribed: true, userId: userId },
              })
            );
            break;
          default:
            console.log(`Unknown message type from user ${userId}:`, data.type);
        }
      } catch (error) {
        console.error(`Error parsing message from user ${userId}:`, error);
      }
    });

    connection.socket.on("close", () => {
      const userConnections = socketConnections.get(userId);
      if (userConnections) {
        userConnections.delete(connection.socket);
        console.log(
          `User ${userId} disconnected. Remaining connections: ${userConnections.size}`
        );

        if (userConnections.size === 0) {
          socketConnections.delete(userId);
          console.log(`Cleaned up empty connection set for user ${userId}`);
        }
      }
    });

    connection.socket.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      const userConnections = socketConnections.get(userId);
      if (userConnections) {
        userConnections.delete(connection.socket);
        if (userConnections.size === 0) {
          socketConnections.delete(userId);
        }
      }
    });
  },
};

export { broadcastToUser, shouldSendNotification };
