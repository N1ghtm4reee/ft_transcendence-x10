import fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import googleOAuthPlugin from "./plugins/google-oauth.js";
import swaggerPlugin from "./plugins/swagger.js";
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauth.js";
import twoFactorRoutes from "./routes/2fa.js";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyMetrics from "fastify-metrics";
// import fastifyEnv from "@fastify/env";
import env from 'dotenv'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: '/app/logs/auth.log' }
    }
  }
});

// env
// await app.register(fastifyEnv, options).after();
env.config();

// metrics
await app.register(fastifyMetrics, {
  endpoint: '/metrics',
  defaultMetrics: true
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
  origin: `http://${process.env.FRONT_IP}:4000`,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

await app.register(authRoutes);
await app.register(oauthRoutes);
await app.register(twoFactorRoutes);

app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/')) {
    request.log.info({ ip: request.ip }, 'new request to auth-service');
  }
});

app.get("/", async (request, reply) => {
  return reply.redirect("/front/index.html");
});

const start = async () => {
  try {
    await app.listen({ port: process.env.AUTH_PORT || 3001, host: "0.0.0.0" });
    console.log(
      `Server listening on http://138.197.30.182:${process.env.AUTH_PORT || 3001}`,
      `origin: http://${process.env.FRONT_IP}:4000`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
