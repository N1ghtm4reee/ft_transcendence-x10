
export const chatSchemas = {
    sendMessageSchema: {
        body: {
            type: 'object',
            required: ['content', 'receiverId'],
            properties: {
                content: { type: 'string' },
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
    getAllConversationsSchema: {
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    },
    getConversationSchema: {
        params: {
            type: 'object',
            required: ['participantId'],
            properties: {
                participantId: { type: 'number' }
            }
        },
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        }
    }
}