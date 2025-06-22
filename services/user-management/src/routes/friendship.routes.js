import {friendshipControllers} from '../controllers/friendship.controllers.js';
import {friendshipSchemas} from '../schemas/friendship.schema.js';

export async function friendshipRoutes(app) {
    app.post('/friendships/', {
        schema: friendshipSchemas.sendFriendRequest,
        handler:friendshipControllers.sendFriendRequest
    })
    
    app.patch('/friendships/:id', {
        schema: friendshipSchemas.proccessRequest,
        handler: friendshipControllers.proccessRequest
    })
    
    app.get('/friendships/', {
        schema: friendshipSchemas.getFriends,
        handler: friendshipControllers.getFriends
    })
    
    app.delete('/friendships/:id', { 
        schema: friendshipSchemas.removeFriend,
        handler: friendshipControllers.removeFriend
    })
    // app.get('/friendships/:id', {
    //     schema: friendshipSchemas.getFriend,
    //     handler: friendshipControllers.getFriend
    // })
    app.get('/friendships/requests/', {
        schema: friendshipSchemas.getRequests,
        handler: friendshipControllers.getFriendRequests
    })
}

