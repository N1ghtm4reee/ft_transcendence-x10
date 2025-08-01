export const userSchemas = {
    createUser: {
        body: {
            type: 'object',
            required: ['id', 'displayName', 'avatar', 'bio'],
            properties: {
                id: { type: 'integer', minimum: 1 },
                displayName: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50,
                    pattern: '^[a-zA-Z0-9\\s.-]+$'
                },
                bio: {
                    type: 'string',
                    maxLength: 500
                },
                avatar: {
                    type: 'string',
                    // format: 'uri', // optional: if your avatar is a URL
                    maxLength: 500
                }
            },
            additionalProperties: false
        },
        response: {
            201: {
                type: 'string',
                description: 'User profile created successfully'
            },
            409: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['User profile already exists'] }
                },
                required: ['error']
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                },
                required: ['error']
            }
        }
    },


    getProfiles: {
        query: {
            type: 'object',
            properties: {
                name: { type: 'string', maxLength: 50 }
            },
            additionalProperties: false
        },
        response: {
            200: {
                type: 'array',
                description: 'Array of user profiles',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        displayName: { type: 'string' },
                        bio: { type: 'string' },
                        avatar: { type: 'string' }
                        // add other userProfile fields if needed
                    },
                    required: ['id', 'displayName', 'bio', 'avatar']
                }
            },
            404: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['No profiles found'] }
                },
                required: ['error']
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                },
                required: ['error']
            }
        }
    },

    getProfile: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'integer', minimum: 1 }
            },
            additionalProperties: false
        },
        query: {
            type: 'object',
            properties: {
                name: { type: 'string', maxLength: 50 }
            },
            additionalProperties: false
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    displayName: { type: 'string' },
                    bio: { type: 'string' },
                    avatar: { type: 'string' }
                    // add other userProfile fields as needed
                },
                required: ['id', 'displayName', 'bio', 'avatar']
            },
            404: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['User profile not found'] }
                },
                required: ['error']
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                },
                required: ['error']
            }
        }
    },

    updateProfile: {
        body: {
            type: 'object',
            properties: {
                displayName: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50,
                    pattern: '^[a-zA-Z0-9\\s.-]+$'
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
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'integer', minimum: 1 }
            },
            additionalProperties: false
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                },
                required: ['message']
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['Nothing to change'] }
                },
                required: ['error']
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                },
                required: ['error']
            }
        }
    },

    myProfile: {
        params: {
            type: 'object',
            properties: {},
            additionalProperties: false
        },
        headers: {
            type: 'object',
            required: ['x-user-id'],
            properties: {
                'x-user-id': { type: 'string', pattern: '^[1-9]\\d*$' }
            },
            additionalProperties: true
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    profile: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            displayName: { type: 'string' },
                            bio: { type: 'string' },
                            avatar: { type: 'string' }
                            // add other userProfile fields as needed
                        },
                        required: ['id', 'displayName', 'bio', 'avatar']
                    },
                    gameHistory: {
                        type: 'array',
                        maxItems: 10,
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                userId: { type: 'integer' },
                                playedAt: { type: 'string', format: 'date-time' },
                                result: {type: 'string'},
                                playerScore: {type: 'integer'},
                                opponentScore: {type: 'integer'}
                                // gameType ?
                                // add other gameHistory fields as needed
                            },
                            required: ['id', 'userId', 'playedAt', 'result', 'playerScore', 'opponentScore']
                        }
                    },
                    gameStats: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            userId: { type: 'integer' },
                            totalGames: { type: 'integer' },
                            wins: { type: 'integer' },
                            losses: { type: 'integer' }
                        },
                        required: ['id', 'userId', 'totalGames', 'wins', 'losses']
                    }
                },
                required: ['profile', 'gameHistory', 'gameStats']
            },
            400: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['Invalid user ID'] }
                },
                required: ['error']
            },
            404: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['User profile not found'] }
                },
                required: ['error']
            },
            500: {
                type: 'object',
                properties: {
                    error: { type: 'string', enum: ['Failed to fetch user profile and game history'] }
                },
                required: ['error']
            }
        }
    }
};
