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

  app.patch('/profiles', {
    schema: userSchemas.updateProfile,
    handler: userController.updateProfile 
  })

  // implement later
  // app.patch('/profiles/avatar', userController.updateAvatar);

}