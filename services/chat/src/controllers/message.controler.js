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

    deleteConversationHistory: async (req, res) => {
        try {
            console.log('deleteConversationHistory called');
            const userId = parseInt(req.params.userId, 10);
            const friendToRemove = parseInt(req.params.friendToRemove, 10);
            // const validationResult = await validateChatPermissions(userId, friendToRemove);
            // if (!validationResult.success) {
            //     return res.status(validationResult.status).send(validationResult.data);
            // }
            // console.log('friendship exists');
            // Find the conversation between the user and the friend
            const conversation = await prisma.conversation.findFirst({
                where: {
                    OR: [
                        {AND: [{ members: { some: { userId: userId } } }, { members: { some: { userId: friendToRemove } } }]},
                        {AND: [{ members: { some: { userId: friendToRemove } } }, { members: { some: { userId: userId } } }]}
                    ]
                },
                select: { id: true }
            });
            if (!conversation) {
                console.error('Conversation not found');
                return res.status(404).send({ error: "Conversation not found" });
            }
            // Delete all messages in the conversation
            const messagesDeleted = await prisma.directMessages.deleteMany({
                where: { conversationId: conversation.id }
            });
            if (!messagesDeleted) {
                console.error('No messages found in the conversation');
                return res.status(404).send({ error: "No messages found in the conversation" });
            }
            // Delete the conversation itself
            const convDeleted = await prisma.conversation.delete({
                where: { id: conversation.id }
            });
            if (!convDeleted) {
                console.error('Conversation not found');
                return res.status(404).send({ error: "Conversation not found" });
            }
        } catch (error) {
            console.error('Error deleting conversation history:', error);
            return res.status(500).send({
                error: 'Failed to delete conversation history',
                details: error.message
            });
        }
        return res.send({ message: "Conversation history deleted successfully" });
    },

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
                id: newMessage.id,
                    content: newMessage.content,
                    senderId: newMessage.senderId,
                    receiverId: newMessage.receiverId,
                    createdAt: newMessage.createdAt,
                    convoId : conversation.id,
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

            return res.code(201).send({
                    id: newMessage.id,
                    content: newMessage.content,
                    senderId: newMessage.senderId,
                    receiverId: newMessage.receiverId,
                    createdAt: newMessage.createdAt
            });

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
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' }
                    },
                    members: {
                        select: { userId: true }
                    }
                }
            });

            console.log("getAllConversations conversations: ", conversations);

            return res.send({
                conversations: conversations.map(conversation => ({
                    id: conversation.id,
                    members: conversation.members.map(m => m.userId),
                    messages: conversation.messages.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        receiverId: msg.receiverId,
                        createdAt: msg.createdAt
                    }))
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

        let conversation = await prisma.conversation.findFirst({
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
                    where: {
                        OR: [
                            { userId: requesterId },
                            { userId: participantId }
                        ]
                    },
                    select: { userId: true }
                }
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    members: {
                        create: [
                            { userId: requesterId },
                            { userId: participantId }
                        ]
                    }
                },
                include: {
                    members: {
                        where: {
                            OR: [
                                { userId: requesterId },
                                { userId: participantId }
                            ]
                        },
                        select: { userId: true }
                    },
                    messages: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });
        }

        return res.send({
            conversation: {
                id: conversation.id,
                members: [requesterId, participantId],
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
        // const userId = Number(req.query.userId);
        // if (!cookies) {
        //     console.error("No cookies provided in WebSocket connection");
        //     connection.socket.close(1008, "Missing cookies");
        //     return;
        // }
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
        const userData = await response.json();
        console.log("User data verified:", userData);
        const userId = userData.user.id;
        if (!userId) {
        console.error("No userId provided in WebSocket connection");
        connection.socket.close(1008, "Missing userId parameter");
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
