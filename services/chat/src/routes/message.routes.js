import {chatControllers} from '../controllers/message.controler.js'
import {chatSchemas} from '../schemas/message.schema.js'

export const chatRoutes = async (app, options) => {

    // app.get('/test', {
    //     // send test response
    //     schema: {
    //         response: {
    //             200: {
    //                 type: 'object',
    //                 properties: {
    //                     message: { type: 'string' }
    //                 }
    //             }
    //         }
    //     },
    //     handler: (request, reply) => {
    //         reply.send({ message: 'Chat service is up and running!' });
    //     }
    // });

    app.post('/messages/',  {
        schema: chatSchemas.sendMessageSchema,
        handler: chatControllers.sendMessage
    });

    app.get('/conversations', {
        schema: chatSchemas.getAllConversationsSchema,
        handler: chatControllers.getAllConversations
    });
    app.get('/conversations/:participantId', {
        schema: chatSchemas.getConversationSchema,
        handler: chatControllers.getConversation
    });
}

export const chatSocket = async (app) => {
    app.get('/live:', { websocket: true }, chatControllers.liveChat);
}