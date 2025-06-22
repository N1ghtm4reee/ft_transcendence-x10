import fastify from 'fastify';
import dotevn from 'dotenv';
import profileRoutes from './routes/user.routes.js';
import multipart from '@fastify/multipart'; // later for image profile uploads
import {friendshipRoutes} from './routes/friendship.routes.js';
import {internalRoutes} from './routes/internal.routes.js'
import { blocksRoutes } from './routes/blocks.routes.js';
// import pino from 'pino';

// const customLogger = pino({
//   level: 'info'
// }, pino.destination('/app/logs/user-management.log'));

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: '/app/logs/user-management.log' }
    }
  }
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