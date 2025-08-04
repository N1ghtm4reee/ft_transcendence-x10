import prisma from "#root/prisma/prisma.js";
import { userUtils } from "../utils/user.utils.js";

export const userController = {
    getProfiles: async function (request, reply) {
        const name = request.query.name || '';
        try {
            const users = await prisma.userProfile.findMany({
                where: {
                    displayName: {
                        contains: name,
                    }
                },
                take: 10
            });
            if (!users) {
                return reply.status(404).send({ error: 'No profiles found' });
            }
            return reply.send(users);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            return reply.status(500).send({ error: 'Failed to fetch profiles' });
        }
    },

    getProfile: async function (request, reply) {
        // convert username to userId

        // const user = await prisma.userProfile.findFirst({
        //     where: { displayName: userName },
        // });


        try {
            // get username from params
            const userName = request.params.id;
            console.log('userName: ', userName);
            // get the requester userId from headers to get h2h vs you
            const requesterId = parseInt(request.headers['x-user-id']);

            // get user profile (name, bio, avatar)
            const user = await prisma.userProfile.findUnique({
                where: {
                    displayName: userName,
                },
            });

            if (!user) {
                console.log('user not found');
                return reply.status(404).send({ error: 'User profile not found' });
            }
            console.log('user: ', user);
            // get user game history h2h
            const gamesH2h = await prisma.gameHistory.findMany({
                where: {
                    userId: user.id,
                    opponentId: requesterId
                },
                orderBy: {
                    playedAt: 'desc'
                }
            });
            console.log('gamesH2h: ', gamesH2h);
            // get user overall game history
            const games = await prisma.gameHistory.findMany({
                where: {
                    userId: user.id
                },
                orderBy: {
                    playedAt: 'desc'
                },
                take: 10
            });
            console.log('games: ', games);
            // ?
            // if (games.length === 0)
            //     return reply.send('No games played')
            // get user achievements
            const userAchievements = await prisma.userProfile.findUnique({
                where: { id: user.id },
                include: {
                    achievements: {
                        select: { id: true }
                    }
                }
            });
            console.log('achievements: ', userAchievements.achievements);
            // get game stats (streak and tournament wins) included
            const stats = await prisma.gameStats.findUnique({
                where: { id: user.id }
            });
            console.log('stats: ', stats);
            // get h2h vs you
            // console.log('game')
            return reply.send({
                user,
                games,
                gamesH2h,
                achievements: userAchievements.achievements,
                stats,
            });
        } catch (error) {
            console.log('error: ', error);
            return reply.status(500).send({ error: 'Failed to fetch user profile' });
        }
    },

    // internal
    createProfile: async function (request, reply) {
        const { id, displayName, avatar, bio } = request.body;

        try {
            await prisma.userProfile.create({ data: { id, displayName, avatar, bio } });
            await prisma.gameStats.create({
                data: {
                    id: id,
                    userId: id,
                    totalGames: 0,
                    wins: 0,
                    losses: 0,
                }
            });

            return reply.status(201).send("User profile created successfully");
        } catch (error) {
            if (error.code === 'P2002') {
                // Unique constraint failed
                return reply.status(409).send({ error: 'User profile already exists' });
            }
            console.error('Error creating user profile:', error);
            return reply.status(500).send({ error: 'Failed to create user profile' });
        }
    },


    updateProfile: async function (request, reply) {
        const userId = parseInt(request.headers['x-user-id']);
        // const userId = 1;
        console.log(userId);
        let updates = request.body;
        if (typeof updates === 'string') {
            updates = JSON.parse(updates);
        }
        console.log(updates);

        if (Object.keys(updates).length === 0) {
            return reply.status(400).send({ error: 'Nothing to change' });
        }
        try {

            const updatedUser = await prisma.userProfile.update({
                where: { id: userId },
                data: updates,
                // select: {
                //     id: true,
                //     displayName: true,
                //     bio: true,
                //     avatar: true,
                //     updatedAt: true
                // }
            });
            return reply.send({
                message: 'User profile updated successfully',
                // user: updatedUser,
                // updatedFields: Object.keys(updates)
            });
        } catch (error) {
            console.error("Update error:", error);
            return reply.status(500).send({ error: 'Failed to update user info' });
        }
    },

    getHistory: async function (request, reply) {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id))
            return reply.status(400).send({ error: 'Invalid user ID' });
        try {
            // get the last 10 games
            const games = await prisma.gameHistory.findMany({
                where: {
                    userId: id
                },
                orderBy: {
                    playedAt: 'desc'
                },
                take: 10
            });
            if (games.length === 0)
                return reply.send('No games played')
            if (!games)
                return reply.status(404).send({ error: '404 error ' });
            return reply.send(games);
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: 'Failed to fetch games history' });
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
        const idHeader = request.headers['x-user-id'];
        const id = parseInt(idHeader, 10);
        console.log('Parsed ID:', id);

        if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
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
                }
            });

            if (!user) {
                return reply.status(404).send({ error: 'User profile not found' });
            }

            // 2. Get game history (last 10)
            const gamesRaw = await prisma.gameHistory.findMany({
                where: { userId: id },
                orderBy: { playedAt: 'desc' },
                take: 10,
            });

            const gameHistory = gamesRaw.map(game => ({
                id: game.id,
                playedAt: game.playedAt.toISOString(),
                result: game.result,
                playerScore: game.playerScore,
                opponentScore: game.opponentScore
            }));

            // 3. Get game stats
            const stats = await prisma.gameStats.findUnique({
                where: { userId: id }
            });

            const gameStats = {
                totalGames: stats.totalGames,
                wins: stats.wins,
                losses: stats.losses,
                tournaments: stats.tournaments,
                tournamentsWins: stats.tournamentsWins,
                bestStreak: stats.bestStreak,
                currentStreak: stats.currentStreak
            };

            // 4. Get achievements
            const userAchievements = await prisma.userProfile.findUnique({
                where: { id },
                include: {
                    achievements: true
                }
            });

            const achievements = userAchievements?.achievements.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                icon: a.icon
            })) || [];

            // 5. Get accepted friendships
            const friendships = await prisma.friendship.findMany({
                where: {
                    status: 'accepted',
                    OR: [{ requesterId: id }, { receiverId: id }]
                },
                include: {
                    requester: {
                        select: { id: true, displayName: true, avatar: true }
                    },
                    receiver: {
                        select: { id: true, displayName: true, avatar: true }
                    }
                }
            });

            const now = new Date();

            const friends = friendships.map(friendship => {
                const friend = (friendship.requesterId === id)
                    ? friendship.receiver
                    : friendship.requester;

                return {
                    id: friend.id,
                    displayName: friend.displayName,
                    avatar: friend.avatar,
                    status: 'online',       // Replace with real logic later
                    lastActive: now         // Replace with real field if available
                };
            });

            // 6. Get friend requests (pending)
            const receivedRequestsRaw = await prisma.friendship.findMany({
                where: { receiverId: id, status: 'pending' },
                include: {
                    requester: {
                        select: { id: true, displayName: true, avatar: true }
                    }
                }
            });

            const sentRequestsRaw = await prisma.friendship.findMany({
                where: { requesterId: id, status: 'pending' },
                include: {
                    receiver: {
                        select: { id: true, displayName: true, avatar: true }
                    }
                }
            });

            const friendRequests = {
                received: receivedRequestsRaw.map(req => ({
                    user: {
                        id: req.requester.id,
                        displayName: req.requester.displayName,
                        avatar: req.requester.avatar,
                        status: 'offline',
                        lastActive: now
                    },
                    createdAt: req.createdAt
                })),
                sent: sentRequestsRaw.map(req => ({
                    user: {
                        id: req.receiver.id,
                        displayName: req.receiver.displayName,
                        avatar: req.receiver.avatar,
                        status: 'offline',
                        lastActive: now
                    },
                    createdAt: req.createdAt
                }))
            };

            return reply.send({
                profile: user,
                gameHistory,
                gameStats,
                achievements,
                friends,
                friendRequests
            });

        } catch (err) {
            console.error('Error in myProfile:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    }
    ,
    allAchievements: async function (request, response) {
        try {
            // get all achievements from database
            const allAchievements = await prisma.achievements.findMany();

            return response.send({
                achievements: allAchievements
            })
        } catch (error) {
            console.error('Prisma error:', error);
            return reply.status(500).send({ error: 'Failed to fetch achievements' });
        }
    },
    getUserAchievements: async function (request, response) {
        const idHeader = request.headers['x-user-id'];
        const id = parseInt(idHeader, 10);
        console.log('Parsed ID:', id);

        try {
            const userAchievements = await prisma.userProfile.findUnique({
                where: { id: id },
                include: {
                    achievements: {
                        select: { id: true }
                    }
                }
            });

            if (!userAchievements) {
                return response.status(404).send({ error: 'User not found' });
            }

            const achievementIds = userAchievements.achievements.map(a => a.id);

            return response.send({
                achievementIds: achievementIds
            });

        } catch (error) {
            console.error('Prisma error:', error);
            return response.status(500).send({ error: 'Failed to fetch achievements' });
        }
    }


}