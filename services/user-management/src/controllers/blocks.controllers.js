import prisma from "#root/prisma/prisma.js";
import { userUtils ,blockUtils } from "../utils/user.utils.js";


export const blocksControllers = {
    blockUser: async (req, res) => {
        const userId = req.headers['x-user-id'];
        const blockedUserId = req.body.blockedUserId;
        console.log(`called blockuser controller with userId : ${userId} and blockedUserId: ${blockedUserId}`);

        if (userId == blockedUserId) {
            return res.status(400).send({ error: 'You cannot block your self Ni66a'})
        }

        if (!await userUtils.exists(blockedUserId)) {
            return res.status(404).send( {error: 'User not found'})
        }

        try {
            if (await blockUtils.exists(userId, blockedUserId)) {
                return res.status(400).send({ error: 'User already blocked' });
            }

            await prisma.blockedUser.create({ data: { blockerId: userId, blockedId: blockedUserId } });
            // remove friendship
            const friendship = await prisma.friendship.findFirst({
                where: {
                OR: [
                    { receiverId: blockedUserId, requesterId: userId },
                    { requesterId: blockedUserId, receiverId: userId },
                ],
                status: 'accepted'
                },
                select: {
                id: true,
                requesterId: true,
                receiverId: true
                },
            });

            if (friendship) {
                await prisma.friendship.delete({
                    where: { id: friendship.id },
                });
                }

            return res.status(201).send('User has been blocked successfully');
        } catch (error) {
            console.error('Error blocking user:', error);
            return res.status(500).send({ error: 'Failed to block user' });
        }
    },

    unblockUser: async (req, res) => {
        const userId = req.headers['x-user-id'];
        const blockedUserId = req.params.id;

        if (userId == blockedUserId) {
            return res.status(400).send({ error: 'You cannot unblock yourself' });
        }
        if (!await userUtils.exists(blockedUserId)) {
            return res.status(404).send({ error: 'User not found' });
        }
        try {

            const existingBlock = await blockUtils.exists(userId, blockedUserId);
            if (!existingBlock) {
                return res.status(404).send({ error: 'Block not found' });
            }

            await prisma.blockedUser.delete({
                where: { id: existingBlock.id }
            });

            return res.status(200).send('User has been unblocked successfully');
        } catch (error) {
            console.error('Error unblocking user:', error);
            return res.status(500).send({ error: 'Failed to unblock user' });
        }
    },
    getBlockedUsers: async (req, res) => {
        const userId = parseInt(req.headers['x-user-id']);

        try {
            const blockedUsers = await prisma.blockedUser.findMany({
                where: { blockerId: userId },
                select: {
                    blocked: {
                        select: {
                            id: true,
                            displayName: true,
                            avatar: true
                        }
                    },
                }
            });

            return res.status(200).send(blockedUsers);
        } catch (error) {
            console.error('Error fetching blocked users:', error);
            return res.status(500).send({ error: 'Failed to fetch blocked users' });
        }
    }
}