import {gameController} from '../controllers/game.controllers.js';
// import { gameSchemas } from '../schemas/game.schema.js'; 

export default async function profileRoutes(app) {

  // internal
  app.post('/update', {
    // schema: gameSchemas.createUser,
    handler: gameController.addGameHistory
  });

  // app.post('/reject', {
  //   // schema: gameSchemas.createUser,
  //   handler: gameController.rejectGameRequest
  // });

  // app.post('/accept', {
  //   // schema: gameSchemas.createUser,
  //   handler: gameController.addGameHistory
  // });  // do we need this?

  app.post('/achievements', {
    // schema: gameSchemas.achievement
    handler: gameController.addAchievements
  })

}