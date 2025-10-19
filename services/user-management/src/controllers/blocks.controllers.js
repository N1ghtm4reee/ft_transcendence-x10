import prisma from "#root/prisma/prisma.js";
import { userUtils, blockUtils } from "../utils/user.utils.js";


export const blocksControllers = {
    blockUser: async (req, res) => {
        const userId = req.headers['x-user-id'];
        const blockedUserId = req.body.blockedUserId;
        console.log(`called blockuser controller with userId : ${userId} and blockedUserId: ${blockedUserId}`);

        if (userId == blockedUserId) {
            return res.status(400).send({ error: 'You cannot block your self Ni66a' })
        }

        if (!await userUtils.exists(blockedUserId)) {
            return res.status(404).send({ error: 'User not found' })
        }

        try {
            if (await blockUtils.blocker(userId, blockedUserId)) {
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
                    status : ("pending" || "accepted")
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
                // 
                // Determine who to notify (the other person)   
                const notifyUserId = blockedUserId

                // Get the current user's display name for the notification
                const currentUser = await prisma.userProfile.findUnique({
                    where: { id: userId },
                    select: { displayName: true }
                });
                // remove chat history with the friend
                try {
                    await fetch(
                        `http://chat-service:3004/api/chat/history/${userId}/${notifyUserId}`,
                        {
                            method: "DELETE",
                        }
                    );
                } catch (error) {
                    console.error("Error removing chat history:", error);
                    // Don't fail the whole operation if chat history removal fails
                }
                // Send notification to the other person
                try {
                    const notification = await fetch(
                        "http://notification-service:3005/api/notifications",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                userId: notifyUserId,
                                type: "FRIEND_REMOVED",
                                title: "Friend Removed",
                                content: `${currentUser?.displayName || 'A user'} removed you from their friends list`,
                                sourceId: userId.toString(),
                            }),
                        }
                    );

                    if (!notification.ok) {
                        console.error(
                            "Failed to send notification:",
                            await notification.text()
                        );
                    }
                } catch (notificationError) {
                    console.error("Notification error:", notificationError);
                    // Don't fail the whole operation if notification fails
                }

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