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

    myProfile: async function (request, reply) {
        const idHeader = request.headers['x-user-id'];
        const id = parseInt(idHeader, 10);
        console.log('Parsed ID:', id);

        if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
        }

        try {
            // Get user profile
            const user = await prisma.userProfile.findUnique({
                where: { id: id },
            });

            if (!user) {
                return reply.status(404).send({ error: 'User profile not found' });
            }

            // Get last 10 games
            const games = await prisma.gameHistory.findMany({
                where: {
                    userId: id
                },
                orderBy: {
                    playedAt: 'desc'
                },
                take: 10
            });
            // Get profile stats
            const stats = await prisma.gameStats.findUnique({
                where: { id: id }
            });

            console.log('stats: ', stats);
            // get user achievement
            // get profile achievements
            const userAchievements = await prisma.userProfile.findUnique({
                where: { id: id },
                include: {
                    achievements: {
                        select: { id: true }
                    }
                }
            });

            const achievementIds = userAchievements ? userAchievements.achievements.map(a => a.id) : [];

            console.log('userAchievements: ', userAchievements);
            return reply.send({
                profile: user,
                gameHistory: games,
                gameStats: stats,
                achievements: achievementIds
            });
        } catch (error) {
            console.error('Prisma error:', error);
            return reply.status(500).send({ error: 'Failed to fetch user profile and game history' });
        }
    },
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