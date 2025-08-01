import {userController} from '../controllers/user.controllers.js';
import { userSchemas } from '../schemas/user.schema.js'; 

export default async function profileRoutes(app) {

  // internal
  app.post('/profiles', {
    schema: userSchemas.createUser,
    handler: userController.createProfile
  });

  app.get('/profiles', userController.getProfiles);
  
  app.get('/profiles/:id', {
    schema: userSchemas.getProfile,
    handler: userController.getProfile
  });

  app.get('/profiles/:id/history', {
    // schema: userSchemas.getProfile,
    handler: userController.getHistory
  });

  app.patch('/profiles', {
    // schema: userSchemas.updateProfile,
    handler: userController.updateProfile 
  })

  app.get('/me', {
    // schema: userSchemas.me,
    handler: userController.myProfile 
  })
  // implement later
  // app.patch('/profiles/avatar', userController.updateAvatar);

}