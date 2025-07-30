import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifyWebsocket from '@fastify/websocket';
import { chatRoutes, chatSocket } from './routes/message.routes.js'
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export const prisma = new PrismaClient();
const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: '/app/logs/chat.log' }
    }
  }
});


app.decorate('prisma', prisma);

await app.register(swagger, {
  swagger: {
    info: {
      title: 'Chat Service API',
      description: 'API docs for the chat service',
      version: '1.0.0',
    },
    host: 'localhost:3004',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  }
});

await app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true,
  transformSpecificationClone: true
});

app.register(fastifyWebsocket);
app.register(chatRoutes, { prefix: '/api/chat/' });
app.register(chatSocket, { prefix: '/ws/chat' });

app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/')) {
    request.log.info({ ip: request.ip }, 'new request to chat-service');
  }
});

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
