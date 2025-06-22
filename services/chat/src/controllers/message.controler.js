import prisma from "#root/prisma/prisma.js";

// Store active WebSocket connections
const socketConnections = new Map(); // userId -> Set of connections

function broadcastToUser(userId, data) {
    const userConnections = socketConnections.get(userId);
    if (userConnections) {
        userConnections.forEach(connection => {
            if (connection.readyState === 1) { // WebSocket.OPEN
                console.log(`Broadcasting message to user ${userId}:`, data);
                try {
                    connection.send(JSON.stringify(data));
                } catch (error) {
                    console.error(`Error sending message to user ${userId}:`, error);
                    userConnections.delete(connection);
                }
            }
        });
    }
}

async function validateChatPermissions(senderId, receiverId) {
    try {
        const response = await fetch(`http://user-service:3002/internal/user-management/chat-permissions/${senderId}/${receiverId}`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, status: response.status, data };
        }

        return { success: true };
    } catch (error) {
        throw new Error(`User service unavailable: ${error.message}`);
    }
}

export const chatControllers = {

   sendMessage: async (req, res) => {
        try {
            const senderId = req.headers['x-user-id'];
            const {content, receiverId} = req.body;
         
            const validationResult = await validateChatPermissions(senderId, receiverId);
            if (!validationResult.success) {
                return res.status(validationResult.status).send(validationResult.data);
            }

            let conversation = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { members: { every: { userId: { in: [senderId, receiverId] } } } },
                        { members: { some: { userId: senderId } } },
                        { members: { some: { userId: receiverId } } }
                    ]
                },
                select: {id: true}
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        members: {
                            create: [
                                { userId: senderId },
                                { userId: receiverId }
                            ]
                        }
                    },
                    select: {id: true}
                });
            }

            const newMessage = await prisma.directMessages.create({
                data: {
                    senderId: senderId,
                    receiverId: receiverId,
                    content: content,
                    conversationId: conversation.id
                },
            });
            newMessage.type = 'new_message';
            broadcastToUser(senderId, newMessage);
            broadcastToUser(receiverId, newMessage);

            return res.code(201).send('Message sent successfully');

        } catch (error) {
            console.error('Error sending message:', error);
            return res.code(500).send({ 
                error: 'Failed to send message',
                details: error.message
            });
        }
    },

    getAllConversations: async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const conversations = await prisma.conversation.findMany({
                where: {
                    members: {
                        some: { userId: userId }
                    }
                },

                select: {
                    id: true,
                    members: { select: { userId: true,} },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            content: true,
                            createdAt: true,
                            senderId: true
                        }
                    }
                }
            });

            return res.send({
                conversations: conversations.map(conv => ({
                    id: conv.id,
                    memberIds: conv.members.map(m => m.userId),
                    lastMessage: conv.messages[0] || null
                }))
            });


        } catch (error) {
            console.error('Error fetching conversations:', error);
            return res.code(500).send({
                error: 'Failed to fetch conversations'
            });
        }
    },

    getConversation: async (req, res) => {
        try {
            const requesterId = req.headers['x-user-id'];
            const participantId = req.params.participantId;
            
            const conversation = await prisma.conversation.findFirst({
                where: {
                    members: {
                        every: {
                            userId: { in: [requesterId, participantId] }
                        }
                    },
                    AND: [
                        { members: { some: { userId: requesterId } } },
                        { members: { some: { userId: participantId } } }
                    ]
                },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' }
                    },
                    members: {
                        select: { userId: true }
                    }
                }
            });

            if (!conversation)
                return res.code(404).send({ error: 'Conversation not found' });
            
            return res.send({
                conversation: {
                    id: conversation.id,
                    members: conversation.members.map(m => m.userId),
                    messages: conversation.messages.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        createdAt: msg.createdAt
                    }))
                }
            });

        } catch (error) {
            console.error('Error fetching conversation:', error);
            return res.code(500).send({ 
                error: 'Failed to fetch conversation'
            });
        }
    },
    // SHOULD BE CALLED SOCKET MANAGER
    liveChat : async (connection, req) => {
        // userId is part of token, so no need to validate 
        const userId = Number(req.query.userId);

        if (!socketConnections.has(userId)) 
            socketConnections.set(userId, new Set());
        
        socketConnections.get(userId).add(connection);
        console.log(`User ${userId} connected to live chat`);
        
        connection.on('close', () => {
            const userConnections = socketConnections.get(userId);
            if (userConnections) {
                userConnections.delete(connection);
                if (userConnections.size === 0) {
                    socketConnections.delete(userId);
                }
            }
            console.log(`User ${userId} disconnected from live chat`);
        })
    },

}






