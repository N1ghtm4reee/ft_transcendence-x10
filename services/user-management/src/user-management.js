import fastify from 'fastify';
import dotevn from 'dotenv';
import profileRoutes from './routes/user.routes.js';
import multipart from '@fastify/multipart'; // later for image profile uploads
import {friendshipRoutes} from './routes/friendship.routes.js';
import {internalRoutes} from './routes/internal.routes.js'
import { blocksRoutes } from './routes/blocks.routes.js';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fastifyMetrics from 'fastify-metrics';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import { fileURLToPath } from 'url';
import path from 'path';

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: '/app/logs/user-management.log' }
    }
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await app.register(fastifyStatic, {
  root: path.join(__dirname, "assets"),
  prefix: "/assets/",
});

await app.register(cors, {
  origin: 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

await app.register(swagger, {
  swagger: {
    info: {
      title: 'User-management Service API',
      description: 'API docs for the chat service',
      version: '1.0.0',
    },
    host: 'localhost:3002',
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

// metrics
await app.register(fastifyMetrics, {
  endpoint: '/metrics',
  defaultMetrics: true
});


dotevn.config();

app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, 
  }
});

app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/')) {
    request.log.info({ ip: request.ip }, 'new request to user-management');
  }
});

app.register(profileRoutes, { prefix: '/api/user-management' });

app.register(friendshipRoutes, { prefix: '/api/user-management' });

app.register(blocksRoutes, { prefix: '/api/user-management' });

app.register(internalRoutes, { prefix: '/internal/user-management' })


app.get('/health', () => {
  app.log.info('health request, healthy response !!');
  return { message: 'healthy' };
});

app.listen({ port: process.env.USER_MANAGMENT_PORT || 3002, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

// try {
//   await app.listen({ port: 3002, host: '0.0.0.0' });
//   console.log('Server running at http://127.0.0.1:3002');
// } catch (err) {
//   app.log.error(err);
//   process.exit(1);
// }
