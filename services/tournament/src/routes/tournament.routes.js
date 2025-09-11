import { tournamentControllers } from "../controllers/tournament.controller.js";
import {
  createTournamentSchema,
  joinTournamentSchema,
  leaveTournamentSchema,
} from "../schemas/tournament.schema.js";

export default async function tournamentRoutes(fastify, opts) {
  fastify.post("/tournament/create", {
    schema: createTournamentSchema,
    handler: tournamentControllers.createTournament,
  });

  fastify.post("/tournament/join", {
    schema: joinTournamentSchema,
    handler: tournamentControllers.joinTournament,
  });

  fastify.post("/tournament/leave", {
    schema: leaveTournamentSchema,
    handler: tournamentControllers.leaveTournament,
  });

  fastify.post("/tournament/:id/start", {
    handler: tournamentControllers.startTournament,
  });

  fastify.post("/tournament/:id/stop", {
    handler: tournamentControllers.stopTournament,
  });

  fastify.post("/tournament/:id/reset", {
    handler: tournamentControllers.resetTournament,
  });

  fastify.get("/tournament/:id", {
    handler: tournamentControllers.getTournament,
  });

  fastify.get("/tournament/:id/matches", {
    handler: tournamentControllers.getTournamentMatches,
  });

  fastify.get("/tournament/list", {
    handler: tournamentControllers.listTournaments,
  });

  fastify.post(
    "/matches/:matchId/report",
    tournamentControllers.reportMatchResult
  );

  fastify.post("/match/:matchId/challenge", {
    handler: tournamentControllers.startTournamentMatch,
  });
}
