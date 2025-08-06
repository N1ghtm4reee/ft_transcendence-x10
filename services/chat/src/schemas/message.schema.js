
// export const chatSchemas = {
//     sendMessageSchema: {
//         body: {
//             type: 'object',
//             required: ['content', 'receiverId'],
//             properties: {
//                 content: { type: 'string' },
//                 receiverId: { type: 'number' }
//             }
//         },
//         headers: {
//             type: 'object',
//             required: ['x-user-id'],
//             properties: {
//                 'x-user-id': { type: 'number' }
//             }
//         }
//     },
//     getAllConversationsSchema: {
//         headers: {
//             type: 'object',
//             required: ['x-user-id'],
//             properties: {
//                 'x-user-id': { type: 'number' }
//             }
//         }
//     },
//     getConversationSchema: {
//         params: {
//             type: 'object',
//             required: ['participantId'],
//             properties: {
//                 participantId: { type: 'number' }
//             }
//         },
//         headers: {
//             type: 'object',
//             required: ['x-user-id'],
//             properties: {
//                 'x-user-id': { type: 'number' }
//             }
//         }
//     }
// }

export const chatSchemas = {
  sendMessageSchema: {
    tags: ['Messages'],
    summary: 'Send a message to another user',
    body: {
      type: 'object',
      required: ['content', 'receiverId'],
      properties: {
        content: { type: 'string', description: 'The message text' },
        receiverId: { type: 'number', description: 'Recipient user ID' }
      }
    },
    headers: {
      type: 'object',
      required: ['x-user-id'],
      properties: {
        'x-user-id': { type: 'number', description: 'Sender user ID (from header)' }
      }
    },
    response: {
      201: {
        description: 'Message sent successfully',
        type: 'string',
        example: 'Message sent successfully'
      },
      403: {
        description: 'User is not allowed to message the receiver',
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      },
      500: {
        description: 'Server error while sending message',
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' }
        }
      }
    }
  },

  getAllConversationsSchema : {
  tags: ['Messages'],
  summary: 'Get all conversations for the authenticated user',
  headers: {
    type: 'object',
    required: ['x-user-id'],
    properties: {
      'x-user-id': { type: 'number', description: 'User ID from header' }
    }
  },
  response: {
    200: {
      description: 'List of conversations with last messages',
      type: 'object',
      properties: {
        conversations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              memberIds: {
                type: 'array',
                items: { type: 'number' }
              },
              lastMessage: {
                type: ['object', 'null'],
                properties: {
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  senderId: { type: 'number' }
                },
                required: ['content', 'createdAt', 'senderId']
              }
            },
            required: ['id', 'memberIds', 'lastMessage']
          }
        }
      },
      required: ['conversations']
    },
    500: {
      description: 'Failed to fetch conversations',
      type: 'object',
      properties: {
        error: { type: 'string' }
      },
      required: ['error']
    }
  }
},

  getConversationSchema: {
    tags: ['Messages'],
    summary: 'Get full conversation with a specific participant',
    params: {
      type: 'object',
      required: ['participantId'],
      properties: {
        participantId: { type: 'number', description: 'ID of the other participant' }
      }
    },
    headers: {
      type: 'object',
      required: ['x-user-id'],
      properties: {
        'x-user-id': { type: 'number', description: 'User ID from header' }
      }
    },
    response: {
      200: {
        description: 'Conversation with all messages',
        type: 'object',
        properties: {
          conversation: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              members: {
                type: 'array',
                items: { type: 'number' }
              },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    content: { type: 'string' },
                    senderId: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Conversation not found',
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      },
      500: {
        description: 'Server error while fetching conversation',
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
};
