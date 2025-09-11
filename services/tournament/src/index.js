import Fastify from "fastify";
import tournamentRoutes from "./routes/tournament.routes.js";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const fastify = Fastify({ logger: true });

fastify.register(swagger, {
  openapi: {
    info: {
      title: "Tournament Service API",
      description: "API for managing tournaments, players, and matches.",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3007/api" }],
  },
});

fastify.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
  staticCSP: true,
  transformSpecification: (swaggerObject, request, reply) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

fastify.register(tournamentRoutes, { prefix: "/api" });

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.TOURNAMENT_PORT || 3007,
      host: "0.0.0.0",
    });
    console.log("Swagger docs available at http://localhost:3007/docs");
    console.log("OpenAPI JSON available at http://localhost:3007/openapi.json");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
