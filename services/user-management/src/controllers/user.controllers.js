import prisma from "#root/prisma/prisma.js";
import { userUtils } from "../utils/user.utils.js";
import fs from "fs";
import path from "path";

const getOnlineStatus = async (userId) => {
  try {
    const res = await fetch(
      `http://notification-service:3005/api/notifications/user/${userId}/online`
    );
    const data = await res.json();
    console.log("IS HE ONLINE", data);
    return data.online;
  } catch (error) {
    console.error(`Error fetching online status for user ${userId}:`, error);
    return false;
  }
};

export const userController = {
  getProfiles: async function (request, reply) {
    const name = request.query.name || "";
    try {
      const users = await prisma.userProfile.findMany({
        where: {
          displayName: {
            contains: name,
          },
        },
        take: 10,
      });
      if (!users) {
        return reply.status(404).send({ error: "No profiles found" });
      }
      return reply.send(users);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      return reply.status(500).send({ error: "Failed to fetch profiles" });
    }
  },

  getProfile: async function (request, reply) {
    // convert username to userId

    // const user = await prisma.userProfile.findFirst({
    //     where: { displayName: userName },
    // });

    try {
      // get username from params
      const userName = request.params.username;
      console.log("userName: ", userName);
      // get the requester userId from headers to get h2h vs you
      const requesterId = parseInt(request.headers["x-user-id"]);

      // get user profile (name, bio, avatar)
      const user = await prisma.userProfile.findUnique({
        where: {
          displayName: userName,
        },
      });

      if (!user) {
        console.log("user not found");
        return reply.status(404).send({ error: "User profile not found" });
      }
      console.log("user: ", user);
      // get user game history h2h
      const gamesH2h = await prisma.gameHistory.findMany({
        where: {
          userId: user.id,
          opponentId: requesterId,
        },
        orderBy: {
          playedAt: "desc",
        },
      });
      console.log("gamesH2h: ", gamesH2h);
      // get user overall game history
      const games = await prisma.gameHistory.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          playedAt: "desc",
        },
        take: 10,
      });
      console.log("games: ", games);
      // ?
      // if (games.length === 0)
      //     return reply.send('No games played')
      // get user achievements
      const userAchievements = await prisma.userProfile.findUnique({
        where: { id: user.id },
        include: {
          achievements: {
            select: { id: true },
          },
        },
      });
      console.log("achievements: ", userAchievements.achievements);
      // get game stats (streak and tournament wins) included
      const stats = await prisma.gameStats.findUnique({
        where: { id: user.id },
      });
      console.log("stats: ", stats);

      const isOnline = await getOnlineStatus(user.id);
      console.log("isOnline: ", isOnline);

      // get h2h vs you
      // console.log('game')
      return reply.send({
        user: {
          ...user,
          isOnline,
        },
        games,
        gamesH2h,
        achievements: userAchievements.achievements,
        stats,
      });
    } catch (error) {
      console.log("error: ", error);
      return reply.status(500).send({ error: "Failed to fetch user profile" });
    }
  },

  // internal
  createProfile: async function (request, reply) {
    const { id, displayName, avatar, bio } = request.body;

    try {
      await prisma.userProfile.create({
        data: { id, displayName, avatar, bio },
      });
      await prisma.gameStats.create({
        data: {
          id: id,
          userId: id,
          totalGames: 0,
          wins: 0,
          losses: 0,
        },
      });

      return reply.status(201).send("User profile created successfully");
    } catch (error) {
      if (error.code === "P2002") {
        // Unique constraint failed
        return reply.status(409).send({ error: "User profile already exists" });
      }
      console.error("Error creating user profile:", error);
      return reply.status(500).send({ error: "Failed to create user profile" });
    }
  },

  // updateProfile: async function (request, reply) {
  //     const userId = parseInt(request.headers['x-user-id']);
  //     console.log(userId);

  //     try {
  //         const data = await request.file();
  //         const fields = {};
  //         let avatarPath = null;

  //         const userProfile = await prisma.userProfile.findUnique({where : {id : userId}});
  //         const oldAvatar = userProfile.avatar;

  //         if (data && data.fields) {
  //             for (const [key, value] of Object.entries(data.fields)) {
  //                 if (value && value.value) {
  //                     fields[key] = value.value;
  //                 }
  //             }
  //         }
  //         if (data && data.file) {
  //             console.log(process.cwd());
  //             console.log('data: ', data);
  //             const uploadDir = path.join(process.cwd(), "src", 'assets');
  //             const fileExtension = path.extname(data.filename);
  //             const filename = `avatar_${userId}_${Date.now()}${fileExtension}`;
  //             avatarPath = path.join(uploadDir, filename);
  //             const buffer = await data.toBuffer();
  //             fs.writeFileSync(avatarPath, buffer);
  //             fields.avatar = `assets/${filename}`;
  //             if (oldAvatar != 'assets/default.png')
  //                 delete `../${oldAvatar}`;
  //         }

  //         const updatedUser = await prisma.userProfile.update({
  //             where: { id: userId },
  //             data: fields,
  //         });

  //         return reply.send({
  //             avatarUrl: fields.avatar,
  //             message: 'User profile updated successfully',
  //         });

  //     } catch (error) {
  //         console.error("Update error:", error);
  //         return reply.status(500).send({ error: 'Failed to update user info' });
  //     }
  // },
  updateProfile: async function (request, reply) {
    const userId = parseInt(request.headers["x-user-id"]);

    if (!userId || isNaN(userId))
      return reply.status(400).send({ error: "Invalid user ID" });

    console.log("Updating profile for user:", userId);

    try {
      let fields = {};
      let avatarPath = null;

      const userProfile = await prisma.userProfile.findUnique({
        where: { id: userId },
      });

      if (!userProfile)
        return reply.status(404).send({ error: "User profile not found" });
      const oldAvatar = userProfile.avatar;
      if (request.isMultipart()) {
        const data = await request.file();

        if (data && data.fields) {
          for (const [key, value] of Object.entries(data.fields)) {
            if (value && value.value) {
              fields[key] = value.value;
            }
          }
        }

        if (data && data.file) {
          console.log("Processing file upload for user:", userId);

          const uploadDir = path.join(process.cwd(), "src", "assets");

          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });

          const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
          const fileExtension = path.extname(data.filename).toLowerCase();

          if (!allowedExtensions.includes(fileExtension)) {
            return reply.status(400).send({
              error:
                "Invalid file type. Allowed: " + allowedExtensions.join(", "),
            });
          }

          const filename = `avatar_${userId}_${Date.now()}${fileExtension}`;
          avatarPath = path.join(uploadDir, filename);

          const buffer = await data.toBuffer();

          fs.writeFileSync(avatarPath, buffer);
          fields.avatar = `assets/${filename}`;

          if (oldAvatar && oldAvatar !== "assets/default.png") {
            const oldAvatarPath = path.join(process.cwd(), "src", oldAvatar);
            try {
              if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
                console.log("Deleted old avatar:", oldAvatarPath);
              }
            } catch (deleteError) {
              console.error("Error deleting old avatar:", deleteError);
            }
          }
        }
      } else {
        fields = request.body || {};
      }

      const updatedUser = await prisma.userProfile.update({
        where: { id: userId },
        data: fields,
      });

      return reply.send({
        success: true,
        avatarUrl: fields.avatar || userProfile.avatar,
        user: updatedUser,
        message: "User profile updated successfully",
      });
    } catch (error) {
      console.error("Update error:", error);

      if (avatarPath && fs.existsSync(avatarPath)) {
        try {
          fs.unlinkSync(avatarPath);
          console.log("Cleaned up failed upload:", avatarPath);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }

      if (error.code === "P2002") {
        return reply.status(409).send({ error: "Duplicate entry" });
      }

      if (error.code === "P2025") {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.status(500).send({
        error: "Failed to update user profile",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  getHistory: async function (request, reply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) return reply.status(400).send({ error: "Invalid user ID" });
    try {
      // get the last 10 games
      const games = await prisma.gameHistory.findMany({
        where: {
          userId: id,
        },
        orderBy: {
          playedAt: "desc",
        },
        take: 10,
      });
      if (games.length === 0) return reply.send("No games played");
      if (!games) return reply.status(404).send({ error: "404 error " });
      return reply.send(games);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Failed to fetch games history" });
    }
  },

  // myProfile: async function (request, reply) {
  //     const idHeader = request.headers['x-user-id'];
  //     const id = parseInt(idHeader, 10);
  //     console.log('Parsed ID:', id);

  //     if (isNaN(id)) {
  //         return reply.status(400).send({ error: 'Invalid user ID' });
  //     }

  //     try {
  //         // Get user profile
  //         const user = await prisma.userProfile.findUnique({
  //             where: { id: id },
  //             include: {
  //                 sentFriendRequests: true,
  //                 receivedFriendRequests: true,
  //                 blockedUsers: true,
  //                 blockedByUsers: true,
  //             },
  //         });

  //         if (!user) {
  //             return reply.status(404).send({ error: 'User profile not found' });
  //         }

  //         // Get last 10 games
  //         const games = await prisma.gameHistory.findMany({
  //             where: {
  //                 userId: id
  //             },
  //             orderBy: {
  //                 playedAt: 'desc'
  //             },
  //             take: 10
  //         });
  //         // Get profile stats
  //         const stats = await prisma.gameStats.findUnique({
  //             where: { id: id }
  //         });

  //         console.log('stats: ', stats);
  //         // get user achievement
  //         // get profile achievements
  //         const userAchievements = await prisma.userProfile.findUnique({
  //             where: { id: id },
  //             include: {
  //                 achievements: {
  //                     select: { id: true }
  //                 }
  //             }
  //         });

  //         // add friends array
  //         const friendships = await prisma.friendship.findMany({
  //             where: {
  //                 status: 'accepted',
  //                 OR: [
  //                     { requesterId: id },
  //                     { receiverId: id }
  //                 ]
  //             },
  //             include: {
  //                 requester: {
  //                     select: {
  //                         id: true,
  //                         displayName: true,
  //                         avatar: true,
  //                         status: "online",
  //                         lastActive: Date.now()
  //                         // add other fields like status or lastActive if needed
  //                     }
  //                 },
  //                 receiver: {
  //                     select: {
  //                         id: true,
  //                         displayName: true,
  //                         avatar: true,
  //                         status: "online",
  //                         lastActive: Date.now()
  //                     }
  //                 }
  //             }
  //         });

  //         // const receivedRequests = await prisma.friendship.findMany({
  //         //     where: {
  //         //         receiverId: id,
  //         //         status: 'pending'
  //         //     },
  //         //     include: {
  //         //         requester: {
  //         //             select: {
  //         //                 id: true,
  //         //                 displayName: true,
  //         //                 avatar: true
  //         //             }
  //         //         }
  //         //     }
  //         // });

  //         // const sentRequests = await prisma.friendship.findMany({
  //         //     where: {
  //         //         requesterId: id,
  //         //         status: 'pending'
  //         //     },
  //         //     include: {
  //         //         receiver: {
  //         //             select: {
  //         //                 id: true,
  //         //                 displayName: true,
  //         //                 avatar: true
  //         //             }
  //         //         }
  //         //     }
  //         // });

  //         const achievementIds = userAchievements ? userAchievements.achievements.map(a => a.id) : [];

  //         console.log('userAchievements: ', userAchievements);
  //         return reply.send({
  //             profile: user,
  //             gameHistory: games,
  //             gameStats: stats,
  //             achievements: achievementIds,
  //             friends: friendships.map(friendship =>
  //                 friendship.requesterId === id ? friendship.receiver : friendship.requester
  //             )
  //         });

  //     } catch (error) {
  //         console.error('Prisma error:', error);
  //         return reply.status(500).send({ error: 'Failed to fetch user profile and game history' });
  //     }
  // }
  myProfile: async function (request, reply) {
    const idHeader = request.headers["x-user-id"];
    const id = parseInt(idHeader, 10);
    console.log("Parsed ID:", id);

    if (isNaN(id)) {
      return reply.status(400).send({ error: "Invalid user ID" });
    }

    try {
      // 1. Get user profile
      const user = await prisma.userProfile.findUnique({
        where: { id },
        select: {
          id: true,
          displayName: true,
          bio: true,
          avatar: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User profile not found" });
      }

      // 2. Get game history (last 10)
      const gamesRaw = await prisma.gameHistory.findMany({
        where: { userId: id },
        orderBy: { playedAt: "desc" },
        take: 10,
      });

      const gameHistory = gamesRaw.map((game) => ({
        id: game.id,
        playedAt: game.playedAt.toISOString(),
        result: game.result,
        playerScore: game.playerScore,
        opponentScore: game.opponentScore,
      }));

      // 3. Get game stats
      const stats = await prisma.gameStats.findUnique({
        where: { userId: id },
      });

      const gameStats = {
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        tournaments: stats.tournaments,
        tournamentsWins: stats.tournamentsWins,
        bestStreak: stats.bestStreak,
        currentStreak: stats.currentStreak,
      };

      // 4. Get achievements
      const userAchievements = await prisma.userProfile.findUnique({
        where: { id },
        include: {
          achievements: true,
        },
      });

      const achievements =
        userAchievements?.achievements.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
        })) || [];

      // 5. Get accepted friendships
      const friendships = await prisma.friendship.findMany({
        where: {
          status: "accepted",
          OR: [{ requesterId: id }, { receiverId: id }],
        },
        include: {
          requester: {
            select: { id: true, displayName: true, avatar: true, lastSeen: true },
          },
          receiver: {
            select: { id: true, displayName: true, avatar: true, lastSeen: true },
          },
        },
      });

      const now = new Date();
      const friends = await Promise.all(
        friendships.map(async (friendship) => {
          const friend =
            friendship.requesterId === id
              ? friendship.receiver
              : friendship.requester;

          return {
            id: friend.id,
            displayName: friend.displayName,
            avatar: friend.avatar,
            status: (await getOnlineStatus(friend.id)) ? "online" : "offline",
            lastActive: friend.lastSeen,
          };
        })
      );

      // 6. Get friend requests (pending)
      const receivedRequestsRaw = await prisma.friendship.findMany({
        where: { receiverId: id, status: "pending" },
        include: {
          requester: {
            select: { id: true, displayName: true, avatar: true, lastSeen: true },
          },
        },
      });

      const sentRequestsRaw = await prisma.friendship.findMany({
        where: { requesterId: id, status: "pending" },
        include: {
          receiver: {
            select: { id: true, displayName: true, avatar: true, lastSeen: true },
          },
        },
      });

      const receivedRequests = await Promise.all(
        receivedRequestsRaw.map(async (req) => ({
          user: {
            id: req.requester.id,
            displayName: req.requester.displayName,
            avatar: req.requester.avatar,
            status: (await getOnlineStatus(req.requester.id))
              ? "online"
              : "offline",
            lastActive: req.requester.lastSeen,
          },
          id: req.id,
          createdAt: req.createdAt,
        }))
      );
      const sentRequests = await Promise.all(
        sentRequestsRaw.map(async (req) => ({
          user: {
            id: req.receiver.id,
            displayName: req.receiver.displayName,
            avatar: req.receiver.avatar,
            status: (await getOnlineStatus(req.receiver.id))
              ? "online"
              : "offline",
            lastActive: req.receiver.lastSeen,
          },
          id: req.id,
          createdAt: req.createdAt,
        }))
      );

      const friendRequests = {
        received: receivedRequests,
        sent: sentRequests,
      };

      return reply.send({
        profile: user,
        gameHistory,
        gameStats,
        achievements,
        friends,
        friendRequests,
      });
    } catch (err) {
      console.error("Error in myProfile:", err);
      return reply.status(500).send({ error: "Internal server error" });
    }
  },
  allAchievements: async function (request, response) {
    try {
      // get all achievements from database
      const allAchievements = await prisma.achievements.findMany();

      return response.send({
        achievements: allAchievements,
      });
    } catch (error) {
      console.error("Prisma error:", error);
      return reply.status(500).send({ error: "Failed to fetch achievements" });
    }
  },
  getUserAchievements: async function (request, response) {
    const idHeader = request.headers["x-user-id"];
    const id = parseInt(idHeader, 10);
    console.log("Parsed ID:", id);

    try {
      const userAchievements = await prisma.userProfile.findUnique({
        where: { id: id },
        include: {
          achievements: {
            select: { id: true },
          },
        },
      });

      if (!userAchievements) {
        return response.status(404).send({ error: "User not found" });
      }

      const achievementIds = userAchievements.achievements.map((a) => a.id);

      return response.send({
        achievementIds: achievementIds,
      });
    } catch (error) {
      console.error("Prisma error:", error);
      return response
        .status(500)
        .send({ error: "Failed to fetch achievements" });
    }
  },

  searchProfile: async function (request, response) {
    const username = request.query.username;
    const userId = parseInt(request.headers["x-user-id"], 10);
    if (!username) {
      return response.status(400).send({ error: "Username is required" });
    }

    try {
      const users = await prisma.$queryRaw`
            SELECT id, display_name, avatar, bio
            FROM "user_profiles"
            WHERE LOWER("display_name") LIKE '%' || ${username.toLowerCase()} || '%'
            AND id != ${userId}
            LIMIT 10
        `;

      if (!users || users.length === 0) {
        return response.status(404).send({ error: "No users found" });
      }

      let onlineUsers = [];
      try {
        const notificationServiceUrls = [
          "http://notification-service:3005",
          "http://localhost:3005",
        ];

        for (const user of users) {
          for (const baseUrl of notificationServiceUrls) {
            try {
              const res = await fetch(
                `${baseUrl}/api/notifications/user/${user.id}/online`
              );
              if (res.ok) {
                const { online } = await res.json();
                if (online) {
                  onlineUsers.push({ id: user.id });
                }
                break;
              }
            } catch (err) {
              console.error(
                `Error fetching online status for user ${user.id} from ${baseUrl}:`,
                err
              );
            }
          }
        }
      } catch (error) {
        console.error("Error fetching online users:", error);
      }
      const usersWithStatus = users.map((user) => {
        const isOnline = onlineUsers.some(
          (onlineUser) => onlineUser.id === user.id
        );
        return {
          id: user.id,
          displayName: user.display_name,
          avatar: user.avatar,
          bio: user.bio,
          status: isOnline ? "online" : "offline",
          rank: "0", // Placeholder
        };
      });

      return response.send({ users: usersWithStatus });
    } catch (error) {
      console.error("Error searching profiles:", error);
      return response.status(500).send({ error: "Failed to search profiles" });
    }
  },
  getUserById: async function (request, response) {
    const userId = parseInt(request.params.userId, 10);
    if (isNaN(userId)) {
      return response.status(400).send({ error: "Invalid user ID" });
    }

    try {
      const user = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          avatar: true,
          bio: true,
        },
      });

      if (!user) {
        return response.status(404).send({ error: "User not found" });
      }

      return response.send(user);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return response.status(500).send({ error: "Failed to fetch user" });
    }
  },
  getLastSeen: async function (request, response) {
    const userId = parseInt(request.headers["x-user-id"], 10);
    if (isNaN(userId)) {
      return response.status(400).send({ error: "Invalid user ID" });
    }

    try {
      const lastSeen = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: { lastSeen: true },
      });

      if (!lastSeen) {
        return response.status(404).send({ error: "User not found" });
      }

      return response.send({ lastSeen: lastSeen.lastSeen });
    } catch (error) {
      console.error("Error fetching last seen:", error);
      return response.status(500).send({ error: "Failed to fetch last seen" });
    }
  },
  updateLastSeen: async function (request, response) {
    const userId = parseInt(request.headers["x-user-id"], 10);
    if (isNaN(userId)) {
      return response.status(400).send({ error: "Invalid user ID" });
    }

    try {
      const updatedUser = await prisma.userProfile.update({
        where: { id: userId },
        data: { lastSeen: new Date() },
      });

      if (!updatedUser) {
        return response.status(404).send({ error: "User not found" });
      }

      return response.send({
        message: "Last seen updated successfully",
        lastSeen: updatedUser.lastSeen,
      });
    } catch (error) {
      console.error("Error updating last seen:", error);
      return response.status(500).send({ error: "Failed to update last seen" });
    }
  },
};
