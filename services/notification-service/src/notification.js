import "dotenv/config";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyCors from "@fastify/cors";
import { prisma } from "./config/database.js";
import {
  notificationRoutes,
  notificationSocket,
} from "./routes/notification.routes.js";
// import env from 'dotenv'

const app = Fastify({ logger: true });

// env.config();
app.decorate("prisma", prisma);

// Register CORS support
app.register(fastifyCors, {
  origin: `http://68.183.57.106:4000`,
  credentials: true,
});

app.register(fastifyWebsocket);
app.register(notificationRoutes, { prefix: "/api/notifications" });
app.register(notificationSocket, { prefix: "/ws/notifications" });

app.get("/health", () => {
  return { message: "Notification service healthy" };
});

const notificationService = async () => {
  try {
    await app.listen({
      port: process.env.NOTIFICATION_PORT || 3005,
      host: "0.0.0.0",
    });
    console.log(`origin: http://${process.env.FRONT_IP}:4000`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

notificationService();
