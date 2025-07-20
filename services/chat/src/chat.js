import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifyWebsocket from '@fastify/websocket';
import { chatRoutes, chatSocket } from './routes/message.routes.js'
export const prisma = new PrismaClient();
const app = Fastify({ logger: true});

app.decorate('prisma', prisma);
app.register(fastifyWebsocket);
app.register(chatRoutes, { prefix: '/api/chat/' });
app.register(chatSocket, { prefix: '/ws/chat' });


app.get('/health', () => {
  return { message: 'healthy' };
});

const chatService = async () => {
    try {
        await app.listen({ port: process.env.CHAT_PORT || 3004, host: '0.0.0.0' });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

chatService();