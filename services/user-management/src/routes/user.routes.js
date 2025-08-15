import { userController } from "../controllers/user.controllers.js";
import { userSchemas } from "../schemas/user.schema.js";

export default async function profileRoutes(app) {
  // internal
  app.post("/profiles", {
    schema: userSchemas.createUser,
    handler: userController.createProfile,
  });

  app.get("/profiles", userController.getProfiles);

  app.get("/profiles/:username", {
    // schema: userSchemas.getProfile,
    handler: userController.getProfile,
  });

  app.get("/profiles/:id/history", {
    // schema: userSchemas.getProfile,
    handler: userController.getHistory,
  });

  app.patch("/profiles", {
    // schema: userSchemas.updateProfile,
    handler: userController.updateProfile,
  });

  app.get("/me", {
    // schema: userSchemas.myProfile,
    handler: userController.myProfile,
  });

  app.get("/allachievements", {
    // schema: userSchemas.allAchievements,
    handler: userController.allAchievements,
  });

  app.get("/achievements", {
    // schema: userSchemas.getUserAchievements,
    handler: userController.getUserAchievements,
  });
  // implement later
  // app.patch('/profiles/avatar', userController.updateAvatar);
  app.get("/profile", {
    handler: userController.searchProfile,
  });

  app.get("/users/:userId", {
    // schema: userSchemas.getUserById,
    handler: userController.getUserById,
  });
}
