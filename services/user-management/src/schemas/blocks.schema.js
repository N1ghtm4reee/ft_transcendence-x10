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
        },
        response: {
            201: {
                type: 'string',
                example: 'User has been blocked successfully'
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
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
        },
        response: {
            200: {
                type: 'string',
                example: 'User has been unblocked successfully'
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
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
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        blocked: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                displayName: { type: 'string' },
                                avatar: { type: 'string', nullable: true }
                            },
                            required: ['id', 'displayName']
                        }
                    }
                }
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    }
}
