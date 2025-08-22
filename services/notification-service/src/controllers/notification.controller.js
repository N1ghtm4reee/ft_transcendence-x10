import { prisma } from "../config/database.js";

const socketConnections = new Map();

function broadcastToUser(userId, data) {
  
  const userConnections = socketConnections.get(parseInt(userId));
  if (userConnections && userConnections.size > 0) {
    console.log(
      `Broadcasting to ${userConnections.size} connections for user ${userId}:`,
      data
    );
    console.log("WAAAAAAAAAAAAAAAAAAAAA : ", data);

    userConnections.forEach((connection) => {
      if (connection.readyState === 1) {
        if (data.type === "FRIEND_REQUEST_RECEIVED") {
          console.log(
            `Sending friend request notification to user ${userId}:`,
            data
          );
          try {
            connection.send(
              JSON.stringify({
                type: "FRIEND_REQUEST_RECEIVED",
                content: data.content,
                title: data.title,
                requestId: data.requestId,
                user: {
                  id: data.user.id,
                  displayName: data.user.displayName,
                  avatar: data.user.avatar,
                },
              })
            );
          } catch (error) {
            console.error(
              `Error sending friend request notification to user ${userId}:`,
              error
            );
            userConnections.delete(connection);
          }
        } else if (data.type === "GAME_INVITE"){
            console.log(
              `Sending game invite notification to user ${userId}:`,
              data
            );
            try {
              connection.send(
                JSON.stringify({
                  type: "GAME_INVITE",
                  content: data.content,
                  title: data.title,
                  gameId: data.gameId,
                  user: {
                    id: data.user.id,
                    displayName: data.user.displayName,
                    avatar: data.user.avatar,
                  },
                })
              );
            } catch (error) {
              console.error(
                `Error sending game invite notification to user ${userId}:`,
                error
              );
              userConnections.delete(connection);
            }
        }
        else if (data.type === "GAME_ACCEPTED"){
            console.log(
              `Sending game invite notification to user ${userId}:`,
              data
            );
            try {
              connection.send(
                JSON.stringify({
                  type: "GAME_ACCEPTED",
                  content: data.content,
                  title: data.title,
                  gameId: data.gameId,
                  user: {
                    id: data.user.id,
                    displayName: data.user.displayName,
                    avatar: data.user.avatar,
                  },
                })
              );
            } catch (error) {
              console.error(
                `Error sending game invite notification to user ${userId}:`,
                error
              );
              userConnections.delete(connection);
            }
        }
        else if (data.type === "GAME_REJECTED"){
            console.log(
              `Sending game invite notification to user ${userId}:`,
              data
            );
            try {
              connection.send(
                JSON.stringify({
                  type: "GAME_REJECTED",
                  content: data.content,
                  title: data.title,
                  gameId: data.gameId,
                  user: {
                    id: data.user.id,
                    displayName: data.user.displayName,
                    avatar: data.user.avatar,
                  },
                })
              );
            } catch (error) {
              console.error(
                `Error sending game invite notification to user ${userId}:`,
                error
              );
              userConnections.delete(connection);
            }
        } else if (data.type === "FRIEND_REQUEST_ACCEPTED") {
          console.log(
            `Sending friend request accepted notification to user ${userId}:`,
            data
          );
          try {
            connection.send(
              JSON.stringify({
                type: "FRIEND_REQUEST_ACCEPTED",
                content: data.content,
                title: data.title,
                user: {
                  id: data.user.id,
                  displayName: data.user.displayName,
                  avatar: data.user.avatar,
                },
              })
            );
          } catch (error) {
            console.error(
              `Error sending friend request accepted notification to user ${userId}:`,
              error
            );
            userConnections.delete(connection);
          }
        } else if (data.type === "FRIEND_REQUEST_DECLINED") {
          console.log(
            `Sending friend request declined notification to user ${userId}:`,
            data
          );

          try {
            connection.send(
              JSON.stringify({
                type: "FRIEND_REQUEST_DECLINED",
                content: data.content,
                title: data.title,
                user: {
                  id: data.user.id,
                  displayName: data.user.displayName,
                  avatar: data.user.avatar,
                },
              })
            );
          } catch (error) {
            console.error(
              `Error sending friend request declined notification to user ${userId}:`,
              error
            );
            userConnections.delete(connection);
          }
        } else if (data.type === "STATUS_UPDATE") {
          console.log(`Sending status update to user ${userId}:`, data);

          try {
            connection.send(
              JSON.stringify({
                type: "STATUS_UPDATE",
                user: {
                  id: data.user.id,
                  isFriend: data.user.isFriend,
                  isOnline: data.isOnline,
                },
              })
            );
          } catch (error) {
            console.error(
              `Error sending status update to user ${userId}:`,
              error
            );
            userConnections.delete(connection);
          }
        } 
        else if (data.type === "FRIEND_REMOVED") {
          console.log(
            `Sending friend removed notification to user ${userId}:`,
            data
          );
          try {
            connection.send(
              JSON.stringify({
                type: "FRIEND_REMOVED",
                content: data.content,
                title: data.title,
                user: {
                  id: data.user.id,
                },
              })
            );
          } catch (error) {
            console.error(
              `Error sending friend removed notification to user ${userId}:`,
              error
            );
            userConnections.delete(connection);
          }
        } else {
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

async function broadcastToAllUsers(userId, connectionType) {
  for (const object of socketConnections) {
    let isFriend;
    let response;
    if (object[0] === userId) continue;
    try {
      response = await fetch(
        `http://user-service:3002/api/user-management/friendships/isFriend/${object[0]}`,
        {
          method: "GET",
          headers: {
            "x-user-id": userId,
          },
        }
      );

      if (!response) {
        throw new Error("failed to fetch users");
      }
      isFriend = await response.json();
      console.log("IS FRIEND: ", isFriend);
    } catch (err) {
      console.log({ message: err });
      return;
    }

    const notification = {
      isOnline: connectionType,
      type: "STATUS_UPDATE",
      user: {
        id: userId,
        isFriend: isFriend,
      },
    };
    broadcastToUser(object[0], notification);
  }
}

export const notificationControllers = {
  createNotification: async (req, res) => {
    try {
      const { userId, type, title, content, sourceId, requestId } = req.body;
      let user;
      try {
        const userResponse = await fetch(
          `http://user-service:3002/api/user-management/users/${sourceId}`,
          {
            method: "GET",
          }
        );
        if (!userResponse.ok) {
          return res.code(404).send({
            error: "User not found",
            sourceId: sourceId,
          });
        }
        user = await userResponse.json();
        console.log("parsed user data:", user);
      } catch (error) {
        console.error("Error fetching user data:", error);
        return res.code(500).send({
          error: "Failed to fetch user data",
          details: error.message,
        });
      }

      const notification = await prisma.notification.create({
        data: {
          userId: parseInt(userId),
          type,
          title,
          content,
          sourceId: String(sourceId)
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
        gameId: requestId,
        requestId: requestId,
        user: {
          id: user.id,
          displayName: user.displayName,
          avatar: user.avatar,
        },
      };

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
      console.log(req.params);
      const userId = parseInt(req.params.userId);
      const userConnections = socketConnections.get(userId) || false;
      console.log(userConnections);
      const isOnline = userConnections && userConnections.size > 0;
      console.log(isOnline);
      return res.code(200).send({
        userId: userId,
        online: isOnline,
        connections: isOnline ? userConnections.size : 0,
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
        totalOnline: onlineUsers.length
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
    const token = req.query.token;
    if (!token) {
      console.error("No token found in cookies");
      connection.socket.close(1008, "Missing token in cookies");
      return;
    }
    console.log("token : ", token);
    const response = await fetch(`http://auth-service:3001/verify`, {
      method: "GET",
      headers: {
        Cookie: `token=${token}`,
      },
    });
    console.log("response : ", response);
    if (!response.ok) {
      console.error("Invalid token provided in WebSocket connection");
      connection.socket.close(1008, "Invalid token");
      return;
    }
    const userData = await response.json();
    console.log("User data verified:", userData);
    const userId = userData.user.id;
    if (!userId) {
      console.error("No userId provided in WebSocket connection");
      connection.socket.close(1008, "Missing userId parameter");
      return;
    }
    if (!socketConnections.has(userId)) {
      socketConnections.set(userId, new Set());
      console.log("added to sockets connected");
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
      broadcastToAllUsers(userId, true);
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
          broadcastToAllUsers(userId, false);
          console.log(`Cleaned up empty connection set for user ${userId}`);
        }

        // update last seen
        const response = fetch(
          `http://user-service:3002/api/user-management/lastSeen`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": userId,
            }
          }
        )
          .then((res) => res.json())
          .then((data) => {
            console.log("Last seen updated for user:", userId);
          })
          .catch((error) => {
            console.error("Error updating last seen:", error);
          });
        if (response) {
          console.log("Last seen updated successfully for user:", userId);
        }
        else {
          console.error("Failed to update last seen for user:", userId);
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

export { broadcastToUser };
