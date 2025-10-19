import prisma from "#root/prisma/prisma.js";

/**
 * User-related database utilities
 */
export const userUtils = {
    /**
     * Check if a user exists by ID
     * @param {number} id - User ID
     * @returns {Promise<boolean>} - True if user exists
     */
    exists: async (id) => {
        const user = await prisma.userProfile.findUnique({
            where: { id: Number(id) },
            select: { id: true }
        });
        return !!user;
    },

    /**
     * Get user profile by ID
     * @param {number} id - User ID
     * @param {object} select - Fields to select
     * @returns {Promise<object|null>} - User profile or null
     */
    getProfile: async (id, select = { id: true, displayName: true, avatar: true }) => {
        return await prisma.userProfile.findUnique({
            where: { id: Number(id) },
            select
        });
    },

    /**
     * Get multiple users by IDs
     * @param {number[]} ids - Array of user IDs
     * @param {object} select - Fields to select
     * @returns {Promise<object[]>} - Array of user profiles
     */
    getMultiple: async (ids, select = { id: true, displayName: true, avatar: true }) => {
        return await prisma.userProfile.findMany({
            where: { id: { in: ids.map(id => Number(id)) } },
            select
        });
    }
};

/**
 * Friendship-related database utilities
 */
export const friendshipUtils = {
    /**
     * Check if friendship exists between two users
     * @param {number} userId1 - First user ID
     * @param {number} userId2 - Second user ID
     * @param {string} status - Friendship status to check (default: 'accepted')
     * @returns {Promise<boolean>} - True if friendship exists
     */
    exists: async (userId1, userId2, status = 'accepted') => {
        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: Number(userId1), receiverId: Number(userId2), status },
                    { requesterId: Number(userId2), receiverId: Number(userId1), status }
                ]
            },
            select: { id: true }
        });
        return !!friendship;
    },

    /**
     * Get friendship record between two users
     * @param {number} userId1 - First user ID
     * @param {number} userId2 - Second user ID
     * @returns {Promise<object|null>} - Friendship record or null
     */
    get: async (userId1, userId2) => {
        return await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: Number(userId1), receiverId: Number(userId2) },
                    { requesterId: Number(userId2), receiverId: Number(userId1) }
                ]
            }
        });
    },

    /**
     * Check if users are friends (accepted status)
     * @param {number} userId1 - First user ID
     * @param {number} userId2 - Second user ID
     * @returns {Promise<boolean>} - True if users are friends
     */
    areFriends: async (userId1, userId2) => {
        return await friendshipUtils.exists(userId1, userId2, 'accepted');
    },

    /**
     * Check if friend request is pending
     * @param {number} senderId - Sender user ID
     * @param {number} receiverId - Receiver user ID
     * @returns {Promise<boolean>} - True if request is pending
     */
    isPending: async (senderId, receiverId) => {
        return await friendshipUtils.exists(senderId, receiverId, 'pending');
    }
};

/**
 * Block-related database utilities
 */
export const blockUtils = {
    /**
     * Check if a block exists between two users (either direction)
     * @param {number} userId1 - First user ID
     * @param {number} userId2 - Second user ID
     * @returns {Promise<object|null>} - Block record with blockerId or null
     */
    blocker: async (userId1, userId2) => {
        const block = await prisma.blockedUser.findFirst({
            where: {
                blockerId: Number(userId1), blockedId: Number(userId2)
            },
            select: { id: true, blockerId: true, blockedId: true }
        });
        console.log(`blocker response : ${block}`);
        return block;
    },
    blocked: async (userId1, userId2) => {
        const blocked = await prisma.blockedUser.findFirst({
            where: {
                blockerId: Number(userId2), blockedId: Number(userId1)
            },
            select: { id: true, blockerId: true, blockedId: true }
        });
        console.log(`blocked response : ${blocked}`);
        return blocked;
    },
    exists: async (userId1, userId2) => {
        return await prisma.blockedUser.findFirst({
            where: {
                OR: [
                    { blockerId: Number(userId1), blockedId: Number(userId2) },
                    { blockerId: Number(userId2), blockedId: Number(userId1) }
                ]
            },
            select: { id: true, blockerId: true, blockedId: true }
        });
    },

    /**
     * Check if user1 has blocked user2 (one direction only)
     * @param {number} blockerId - Blocker user ID
     * @param {number} blockedId - Blocked user ID
     * @returns {Promise<boolean>} - True if blocked
     */
    hasBlocked: async (blockerId, blockedId) => {
        const block = await prisma.blockedUser.findFirst({
            where: { 
                blockerId: Number(blockerId), 
                blockedId: Number(blockedId) 
            },
            select: { id: true }
        });
        return !!block;
    },

    /**
     * Get all users blocked by a user
     * @param {number} blockerId - Blocker user ID
     * @returns {Promise<object[]>} - Array of blocked user records
     */
    getBlockedUsers: async (blockerId) => {
        return await prisma.blockedUser.findMany({
            where: { blockerId: Number(blockerId) },
            include: {
                blocked: {
                    select: {
                        id: true,
                        displayName: true,
                        avatar: true
                    }
                }
            }
        });
    }
};

/**
 * Combined validation utilities
 */
export const validationUtils = {
    /**
     * Validate if users can interact (friends and not blocked)
     * @param {number} userId1 - First user ID
     * @param {number} userId2 - Second user ID
     * @returns {Promise<object>} - Validation result with success flag and reason
     */
    canInteract: async (userId1, userId2) => {
        // Check if both users exist
        const user1Exists = await userUtils.exists(userId1);
        const user2Exists = await userUtils.exists(userId2);
        
        if (!user1Exists) {
            return { success: false, reason: 'USER_NOT_FOUND', details: { userId: userId1 } };
        }
        
        if (!user2Exists) {
            return { success: false, reason: 'USER_NOT_FOUND', details: { userId: userId2 } };
        }

        // Check if they are friends
        const areFriends = await friendshipUtils.areFriends(userId1, userId2);
        if (!areFriends) {
            return { success: false, reason: 'NOT_FRIENDS', details: { userId1, userId2 } };
        }

        // Check if blocked
        const blockExists = await blockUtils.exists(userId1, userId2);
        if (blockExists) {
            const reason = blockExists.blockerId === Number(userId1) 
                ? 'YOU_BLOCKED_USER' 
                : 'USER_BLOCKED_YOU';
            return { 
                success: false, 
                reason, 
                details: { blockerId: blockExists.blockerId, blockedId: blockExists.blockedId } 
            };
        }

        return { success: true };
    },

    /**
     * Validate chat permissions between users
     * @param {number} senderId - Sender user ID
     * @param {number} receiverId - Receiver user ID
     * @returns {Promise<object>} - Validation result
     */
    validateChatPermissions: async (senderId, receiverId) => {
        return await validationUtils.canInteract(senderId, receiverId);
    }
};

/**
 * Export all utilities as a single object for convenience
 */
export const dbUtils = {
    user: userUtils,
    friendship: friendshipUtils,
    block: blockUtils,
    validation: validationUtils
};

export default dbUtils;