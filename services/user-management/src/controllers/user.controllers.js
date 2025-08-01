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
        const id = request.params.id;
        try {
            const user = await prisma.userProfile.findUnique({ where: { id: id } });
            if (!user) {
                return reply.status(404).send({ error: 'User profile not found' });
            }
            return reply.send(user);
        } catch (error) {
            return reply.status(500).send({ error: 'Failed to fetch user profile' });
        }
    },

    // internal
    createProfile: async function (request, reply) {
        // no need to validate, i control the creation of user profiles
        const { id, displayName, avatar, bio } = request.body;

        try {
            await prisma.userProfile.create({ data: { id, displayName, avatar, bio } });
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

        return reply.send({
            profile: user,
            gameHistory: games
        });
    } catch (error) {
        console.error('Prisma error:', error);
        return reply.status(500).send({ error: 'Failed to fetch user profile and game history' });
    }
}

}