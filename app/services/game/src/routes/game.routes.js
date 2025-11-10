import { gameController } from "../controllers/game.controllers.js";

export default async function profileRoutes(app) {
  app.post("/update", {
    handler: gameController.addGameHistory,
  });

  app.post("/achievements", {
    handler: gameController.addAchievements,
  });

  app.get("/leaderboard", {
    handler: gameController.leaderboard,
  });

  app.put("/updateRanks", {
    handler: gameController.updateRanks,
  });
}
