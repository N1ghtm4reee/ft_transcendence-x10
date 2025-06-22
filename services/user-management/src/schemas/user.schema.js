
export const userSchemas = {
    // no need ig
    createUser: {
        body: {
            type: 'object',
            required: ['id', 'displayName', 'avatar', 'bio'],
            properties: {
                id: { type: 'number' },
                displayName: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50, // will be check from the frontend
                    pattern: '^[a-zA-Z0-9\\s._-]+$'
                },
                bio: {
                    type: 'string',
                    maxLength: 500
                },
                avatar: {
                    type: 'string',
                    // format: 'uri',
                    maxLength: 500
                }
            }
        }
    },
    getProfile: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        },
        query: {
            type: 'object',
            properties: {
                name: { type: 'string', maxLength: 50 }
            },
            additionalProperties: false
        }
    },
    updateProfile: {
        body: {
            type: 'object',
            properties: {
                displayName: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50, // will be check from the frontend
                    pattern: '^[a-zA-Z0-9\\s._-]+$'
                },
                bio: {
                    type: 'string',
                    maxLength: 500
                },
                avatar: {
                    type: 'string',
                    format: 'uri',
                    maxLength: 500
                }
            },
            additionalProperties: false,
            minProperties: 1
        },
        headers: {
            type: 'object',
            properties: {
                'x-user-id': { type: 'number' }
            },
            required: ['x-user-id']
        }
    }
};