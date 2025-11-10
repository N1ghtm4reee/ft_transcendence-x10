import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import googleOAuthPlugin from "./plugins/google-oauth.js";
import swaggerPlugin from "./plugins/swagger.js";
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauth.js";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyMetrics from "fastify-metrics";
import { formatValidationErrors } from "./utils/errorMessages.js";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();


const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "production"
        ? {
            target: "pino/file",
            options: {
              destination: "/app/logs/auth.log",
              sync: false,
              mkdir: true,
            },
          }
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
  },
});

await app.register(fastifyMetrics, {
  endpoint: "/metrics",
  defaultMetrics: true,
});


app.get("/health", async (request, reply) => {
  return reply.code(200).send({
    status: "ok",
    service: "auth-service",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

await app.register(swaggerPlugin);
await app.register(prismaPlugin);
await app.register(jwtPlugin);
await app.register(googleOAuthPlugin);

await app.register(import("@fastify/static"), {
  root: path.join(__dirname, "front"),
  prefix: "/front/",
});

await app.register(cors, {
  origin: `${process.env.HTTP}://${process.env.FRONT_IP}:4000`,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

await app.register(authRoutes);
await app.register(oauthRoutes);


app.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
    let schemaType = "unknown";
    if (request.url.includes("/signup")) {
      schemaType = "signup";
    } else if (request.url.includes("/login")) {
      schemaType = "login";
    }

    const formattedError = formatValidationErrors(error.validation, schemaType);
    reply.status(400).send(formattedError);
    return;
  }

  if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  reply.status(500).send({
    error: "Internal Server Error",
    statusCode: 500,
  });
});

app.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/")) {
    request.log.info({ ip: request.ip }, "new request to auth-service");
  }
});

app.get("/", async (request, reply) => {
  return reply.redirect("/front/index.html");
});

const start = async () => {
  try {
    await app.listen({ port: process.env.AUTH_PORT || 3001, host: "0.0.0.0" });
    console.log(
      `Server listening on http://${process.env.FRONT_IP}:${process.env.AUTH_PORT || 3001}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  app.log.info("SIGTERM received, shutting down gracefully");
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error("Error during shutdown", err);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  app.log.info("SIGINT received, shutting down gracefully");
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error("Error during shutdown", err);
    process.exit(1);
  }
});

start();
