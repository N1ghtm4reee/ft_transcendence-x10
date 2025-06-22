
export const friendshipSchemas = {
    sendFriendRequest: {
        body: {
            type: 'object',
            required: ['receiverId'],
            properties: {
                receiverId: { type: 'number' }
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
    proccessRequest: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        },
        body: {
            type: 'object',
            required: ['action'],
            properties: {
                action: { type: 'string', enum: ['accepted', 'declined', 'cancelled'] }
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
    getFriends: {
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    },
    // getFriend: {
    //     params: {
    //         type: 'object',
    //         required: ['id'],
    //         properties: {
    //             id: { type: 'number' }
    //         }
    //     },
    //     headers: {
    //         type: 'object',
    //         required: ['x-user-id'],
    //         properties: {
    //             'x-user-id': { type: 'number' }
    //         }
    //     }
    // },
    removeFriend: {
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
    getFriendRequests: {
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    }
}