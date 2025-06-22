
export const internalSchemas = {
    getChatPermissions: {
        params: {
            type: 'object',
            properties: {
                senderId: { type: 'number' },
                receiverId: { type: 'number' }
            },
            required: ['senderId', 'receiverId']
        }
    }
}
