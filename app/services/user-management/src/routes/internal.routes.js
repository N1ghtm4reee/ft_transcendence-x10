import {internalControllers} from '../controllers/internal.controllers.js';
import {internalSchemas} from '../schemas/internal.schemas.js';
export async function internalRoutes(app) {
    app.get('/chat-permissions/:senderId/:receiverId', {
        schema: internalSchemas.getChatPermissions,
        handler: internalControllers.getChatPermissions
    })

    app.post('achievements/:id', {
        handler: internalControllers.addAchievements
    })
}