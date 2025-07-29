export const internalSchemas = {
  getChatPermissions: {
    params: {
      type: 'object',
      properties: {
        senderId: { type: 'integer', minimum: 1 },
        receiverId: { type: 'integer', minimum: 1 }
      },
      required: ['senderId', 'receiverId'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        description: 'Chat permission granted',
        properties: {}
      },
      403: {
        type: 'object',
        description: 'Permission denied error',
        properties: {
          error: { type: 'string', enum: ['PERMISSION_DENIED'] },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              senderId: { type: 'integer' },
              receiverId: { type: 'integer' }
            },
            required: ['senderId', 'receiverId']
          }
        },
        required: ['error', 'message', 'data']
      },
      404: {
        type: 'object',
        description: 'User not found error',
        properties: {
          error: { type: 'string', enum: ['USER_NOT_FOUND'] },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              receiverId: { type: 'integer' }
            },
            required: ['receiverId']
          }
        },
        required: ['error', 'message', 'data']
      },
      500: {
        type: 'object',
        description: 'Internal server error',
        properties: {
          error: { type: 'string', enum: ['INTERNAL_ERROR'] },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              systemError: { type: 'string' },
              senderId: { type: 'integer' },
              receiverId: { type: 'integer' }
            },
            required: ['systemError', 'senderId', 'receiverId']
          }
        },
        required: ['error', 'message', 'data']
      }
    }
  }
};
