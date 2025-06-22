
export const blocksSchemas = {
    blockUser: {
        body: {
            type: 'object',
            required: ['blockedUserId'],
            properties: {
                blockedUserId: { type: 'number' }
            }
        },
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    },
    unblockUser: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        },
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    },
    getBlockedUsers: {
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    }
}