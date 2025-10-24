import "dotenv/config";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyCors from "@fastify/cors";
import { prisma } from "./config/database.js";
import {
  notificationRoutes,
  notificationSocket,
} from "./routes/notification.routes.js";

const app = Fastify({ logger: true });

app.decorate("prisma", prisma);


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
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

notificationService();
