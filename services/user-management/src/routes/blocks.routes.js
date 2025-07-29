import { blocksControllers } from '../controllers/blocks.controllers.js';
import { blocksSchemas } from '../schemas/blocks.schema.js';

export async function blocksRoutes(app) {
    app.post('/blocks/', {
        schema: blocksSchemas.blockUser,
        handler: blocksControllers.blockUser
    });

    app.delete('/blocks/:id', {
        schema: blocksSchemas.unblockUser,
        handler: blocksControllers.unblockUser
    });

    app.get('/blocks/', {
        handler: blocksControllers.getBlockedUsers
    });
}
