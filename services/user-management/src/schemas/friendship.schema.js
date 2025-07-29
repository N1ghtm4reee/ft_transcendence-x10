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
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    requesterId: { type: 'number' },
                    receiverId: { type: 'number' },
                    status: { type: 'string' }
                }
            },
            400: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } },
            500: { type: 'object', properties: { error: { type: 'string' } } }
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
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                }
            },
            400: { type: 'object', properties: { error: { type: 'string' } } },
            403: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } },
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    },

    getFriends: {
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'number' }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    friends: {
                        type: 'array',
                        items: {
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
            404: { type: 'object', properties: { error: { type: 'string' } } },
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    },

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
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                }
            },
            404: { type: 'object', properties: { error: { type: 'string' } } },
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    },

    getFriendRequests: {
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
                        id: { type: 'number' },
                        requesterId: { type: 'number' },
                        receiverId: { type: 'number' },
                        status: { type: 'string' },
                        requester: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                displayName: { type: 'string' },
                                avatar: { type: 'string', nullable: true }
                            }
                        }
                    }
                }
            },
            500: { type: 'object', properties: { error: { type: 'string' } } }
        }
    }
}
