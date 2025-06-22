import prisma from '#root/prisma/prisma.js';
import { userUtils, friendshipUtils , blockUtils} from '../utils/user.utils.js';

export const friendshipControllers = {
    sendFriendRequest: async (req, res) => {

        const requesterId = req.headers['x-user-id'];        
        const receiverId = req.body.receiverId;

        if (requesterId == receiverId) {
            return res.status(400)
            .send({error: 'You cannot send a friend request to yourself.'});
        }
        try {

            if (!await userUtils.exists(receiverId)) {
                return res.status(404).send({ error: 'Receiver user not found' });
            }

            if (await friendshipUtils.isPending(requesterId, receiverId)) {
                return res.status(400).send({ error: 'Friendship request already sent' });
            } 

            if (await friendshipUtils.exists(requesterId, receiverId)) {
                return res.status(400).send({ error: 'Friendship already exists' });
            }
            const blockExists = await blockUtils.exists(requesterId, receiverId);
            if (blockExists) {
                return res.status(400).send(
                    { 
                        error: `Can't send Friend request: ${(blockExists.blockerId == requesterId)
                        ? "you blocked this user" : "this user blocked you"}`
                    });
            }

            const friendship = await prisma.friendship.create({
                data: {
                    requesterId: requesterId,
                    receiverId: receiverId,
                    status: 'pending'
                }
            });

            // notify the user about the friend request (notification service to be implemented)
            return res.status(201).send(friendship);
        } catch (error) {
            console.error('Error sending friend request:', error);
            return res.status(500).send({ error: 'Failed to send friend request' });
        }
    },
    proccessRequest: async (req, res) => {
        const requestid = req.params.id;
        const proccesserId = req.headers['x-user-id'];
        const action =  req.body.action;

        try {
            const friendship = await prisma.friendship.findUnique({ where: { id: requestid } });

            if (!friendship) {
                return res.status(404).send({ error: 'Friendship request not found' });
            }

            if (proccesserId !== friendship.receiverId && proccesserId !== friendship.requesterId) {
                return res.status(403).send({ error: 'You are not authorized to process this request' });
            }

            if (friendship.status !== 'pending') {
                return res.status(400).send({ error: 'Friendship already processed' });
            }
            if (action == 'cancelled' && proccesserId !== friendship.requesterId) {
                return res.status(403).send({ error: 'You can only cancel your own friend requests' });
            }
            if (action === 'declined' || action === 'cancelled') {
                await prisma.friendship.delete({ where: { id: requestid } });
                return res.send({ message: `Friend request ${action}` });
            }

            await prisma.friendship.update({
                where: { id: requestid },
                data: { status: 'accepted' }
            });

            return res.send({ message: `Friend request accepted` });
        } catch (error) {
            console.error('Error processing friend request:', error);
            return res.status(500).send({ error: 'Failed to process friend request' });
        }
    },

    getFriends : async (req, res) => {
        const userId = req.headers['x-user-id'];

        try {
            // can i add search in the friendlist ?  y9dr udirha lfront ?
            const friendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { requesterId: userId, status: 'accepted' },
                        { receiverId: userId, status: 'accepted' }
                    ]
                },
                include: {
                    requester: {
                        select:{
                            id: true,
                            displayName: true,
                            avatar: true,            
                        }
                    },
                    receiver: {
                        select: {
                            id: true,
                            displayName: true,
                            avatar: true,
                        }
                    }
                }
            });
            if (!friendships) {
                return res.status(404).send({ error: 'No friends found' });
            }

            return res.send({
                friends: friendships.map(friendship => {
                    return friendship.requesterId === userId
                        ? friendship.receiver
                        : friendship.requester;
                })
            });
        } catch (error) {
            console.error('Error fetching friends:', error);
            return res.status(500).send({ error: 'Failed to fetch friends' });
        }
    },

    removeFriend: async (req, res) => {
        const friendshipId  = req.params.id;
        // change this 
        try {
            const friendship = await prisma.friendship.findUnique({
                where: {id: friendshipId},
                select: {id: true}
            });

            if (!friendship) {
                return res.status(404).send({ error: 'Friendship not found' });
            }

            await prisma.friendship.delete({
                where: { id: friendshipId }
            });

            return res.send({ message: 'Friend removed successfully' });
        } catch (error) {
            console.error('Error removing friend:', error);
            return res.status(500).send({ error: 'Failed to remove friend' });
        }
    },

    getFriendRequests: async (req, res) => {
        const userId = req.headers['x-user-id'];

        const status = req.query.status || 'pending'; // todo: return friendrequests by status later
        try {
            const requests = await prisma.friendship.findMany({
                where: {
                    receiverId: userId,
                    status: status
                },
                include: {
                    requester: true // modify to include only necessary fields if needed
                }
            });

            return res.send(requests);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
            return res.status(500).send({ error: 'Failed to fetch friend requests' });
        }
    }
}