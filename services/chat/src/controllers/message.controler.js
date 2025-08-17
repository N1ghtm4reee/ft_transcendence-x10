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
            console.log('error validate chat permission');
            return { success: false, status: response.status, data };
        }

        return { success: true };
    } catch (error) {
        throw new Error(`User service unavailable: ${error.message}`);
    }
}

export const chatControllers = {


    createConversation: async (req, res) => {
        try {
            const senderId = parseInt(req.headers['x-user-id'], 10);
            const receiverId = req.body.receiverId;
            const receiverIdInt = parseInt(receiverId, 10);

            const validationResult = await validateChatPermissions(senderId, receiverIdInt);
            if (!validationResult.success) {
                return res.status(validationResult.status).send(validationResult.data);
            }
            console.log('friendship exists');
            // Find existing conversation between these two users
            let conversation = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { members: { some: { userId: senderId } } },
                        { members: { some: { userId: receiverIdInt } } }
                    ]
                },
                select: { id: true }
            });

            // Create conversation if it doesn't exist
            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        members: {
                            create: [
                                { userId: senderId },
                                { userId: receiverIdInt }
                            ]
                        }
                    },
                    select: { id: true }
                });
            }
            const data = {
                type: 'new_conversation',
                conversationId: conversation.id,
                senderId,
            };

            broadcastToUser(receiverId, data);
            return res.send({
                conversation: {
                    id: conversation.id
                }
            });
        }
        catch (error) {
            console.error('Error creating conversation :', error);
            return res.code(500).send({
                error: 'Failed to create conversation',
                details: error.message
            });
        }
    },
    // send a message to a user before sending we validate friendship exists
    sendMessage: async (req, res) => {
        try {
            const senderId = parseInt(req.headers['x-user-id'], 10);
            const { content, receiverId } = req.body;
            const receiverIdInt = parseInt(receiverId, 10);

            const validationResult = await validateChatPermissions(senderId, receiverIdInt);
            if (!validationResult.success) {
                return res.status(validationResult.status).send(validationResult.data);
            }
            console.log('friendship exists');
            // Find existinroag conversation between these two users
            let conversation = await prisma.conversation.findFirst({
                where: {
                    AND: [
                        { members: { some: { userId: senderId } } },
                        { members: { some: { userId: receiverIdInt } } }
                    ]
                },
                select: { id: true }
            });

            // Create conversation if it doesn't exist
            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        members: {
                            create: [
                                { userId: senderId },
                                { userId: receiverIdInt }
                            ]
                        }
                    },
                    select: { id: true }
                });
            }

            // Create the message
            const newMessage = await prisma.directMessages.create({
                data: {
                    senderId: senderId,
                    receiverId: receiverIdInt,
                    content: content,
                    conversationId: conversation.id
                },
            });

            // Prepare message for broadcast
            const messageForBroadcast = {
                ...newMessage,
                type: 'new_message'
            };

            // Broadcast to both users
            broadcastToUser(senderId, messageForBroadcast);
            broadcastToUser(receiverIdInt, messageForBroadcast);

            // send notification to the receiver
            const notifResponse = await fetch('http://notification-service:3005/api/notifications/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: receiverIdInt,
                    type: "message",
                    title: `new message received`,
                    content: content
                }),
            });
            if (notifResponse.ok)
                console.log('notification sent to received user ok');

            return res.code(201).send('Message sent successfully');

        } catch (error) {
            console.error('Error sending message:', error);
            return res.code(500).send({
                error: 'Failed to send message',
                details: error.message
            });
        }
    },

    // get all latest conversations of a user with multiple users
    getAllConversations: async (req, res) => {
        try {
            const userId = parseInt(req.headers['x-user-id'], 10);
            console.log('getAllConversations userId: ', userId);

            const conversations = await prisma.conversation.findMany({
                where: {
                    members: {
                        some: { userId: userId }
                    }
                },
                select: {
                    id: true,
                    members: {
                        select: { userId: true }
                    },
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

            console.log("getAllConversations conversations: ", conversations);

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

    // get the whole conversation with a single user
    getConversation: async (req, res) => {
        try {
            const requesterId = parseInt(req.headers['x-user-id'], 10);
            const participantId = parseInt(req.params.participantId, 10);

            const conversation = await prisma.conversation.findFirst({
                where: {
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

            if (!conversation) this.createConversation(req, res);

            return res.send({
                conversation: {
                    id: conversation.id,
                    members: conversation.members.map(m => m.userId),
                    messages: conversation.messages.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        receiverId: msg.receiverId,
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

    // WebSocket connection manager
    liveChat: async (connection, req) => {
        // userId is part of token, so no need to validate 
        const userId = Number(req.query.userId);
        if (!cookies) {
            console.error("No cookies provided in WebSocket connection");
            connection.socket.close(1008, "Missing cookies");
            return;
        }
        const token = req.query.token;
        if (!token) {
        console.error("No token found in cookies");
        connection.socket.close(1008, "Missing token in cookies");
        return;
        }
        console.log("token : ", token);
        const response = await fetch(`http://auth-service:3001/verify`, {
            method: "GET",
            headers: {
                Cookie: `token=${token}`,
            },
        });
        console.log("response : ", response);
        if (!response.ok) {
            console.error("Invalid token provided in WebSocket connection");
            connection.socket.close(1008, "Invalid token");
            return;
        }
        if (!socketConnections.has(userId)) {
            socketConnections.set(userId, new Set());
        }

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
        });
    },
};
