import prisma from "#root/prisma/prisma.js";
import {createErrorResponse} from "../utils/errorHandler.js";


async function userExists(id) {
    const user = await prisma.userProfile.findUnique({
        where: { id: id },
        select: { id: true }
    });
    return !!user
}

async function friendshipExists(senderId, receiverId) {
    const existingFriendship = await prisma.Friendship.findFirst({
        where: {
            OR: [
                { requesterId: senderId, receiverId: receiverId, status: 'accepted' },
                { requesterId: receiverId, receiverId: senderId, status: 'accepted' }
            ]
        },
        select: { id: true }
    });
    return !!existingFriendship
}

async function blockExists(blockerId, blockedId) {
    const existingBlock = await prisma.blockedUser.findFirst({
        where: {
            OR: [
                { blockerId: blockerId, blockedId: blockedId },
                { blockerId: blockedId, blockedId: blockerId }
            ]
        },
        select: { id: true, blockerId: true }
    });
    return existingBlock
}

export const internalControllers = {
    getChatPermissions: async (req, res) => {
        const senderId = req.params.senderId;
        const receiverId = req.params.receiverId;
        
        try {
            // user existence already checked in auth by the gateway
            const receiver = await userExists(receiverId); 

            if (!receiver) {
                return res.status(404).send(
                    createErrorResponse('USER_NOT_FOUND', 'Receiver not found', { receiverId })
                );
            }
            
            const friendshipexists = await friendshipExists(senderId, receiverId);
            if (!friendshipexists) {
                return res.status(403).send(
                    createErrorResponse('PERMISSION_DENIED', 'Users are not friends', { senderId, receiverId })
                );
            }
            const blockExistsResult = await blockExists(senderId, receiverId);
            if (!!blockExistsResult) {
                console.log('block object', blockExistsResult);

                
                return res.status(403).send(
                    createErrorResponse('PERMISSION_DENIED', 
                    (blockExistsResult.blockerId == senderId)
                    ? 'you blocked this user' : 'this user blocked you',
                    { senderId, receiverId })
                );
            }
            
            return res.send({});
            
        } catch (error) {
            return res.status(500).send(
                createErrorResponse('INTERNAL_ERROR', 'Verification failed', { 
                    systemError: error.message,
                    senderId,
                    receiverId
                })
            );
        }
    },
    addAchievements: async (req, res) => {
        // implement adding achievements  and sending notifications of unlocking new achievements

    }
}
