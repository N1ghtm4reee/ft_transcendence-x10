import {gameController} from '../controllers/game.controllers.js';
// import { gameSchemas } from '../schemas/game.schema.js'; 

export default async function profileRoutes(app) {

  // internal
  app.post('/update', {
    // schema: gameSchemas.createUser,
    handler: gameController.addGameHistory
  });

  app.post('/achievements', {
    // schema: gameSchemas.achievement
    handler: gameController.addAchievements
  })

}