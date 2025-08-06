import fastify from 'fastify';
import proxy from '@fastify/http-proxy';
import dotenv from 'dotenv';
import fastifyMetrics from 'fastify-metrics';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
dotenv.config();

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: '/app/logs/api-gateway.log' }
    }
  }
});

// metrics
await app.register(fastifyMetrics, {
  endpoint: '/metrics',
  defaultMetrics: true
});

app.register(cookie)

app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/')) {
    request.log.info({ ip: request.ip }, 'api-gateway received request');
  }
});

await app.register(cors, {
  origin: 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

const authenticateUser = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token)
    {
      console.log('invelid token');
      return res.status(401).send({error: 'Unauthorized: missing/invalid token'})
    }

    const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL}/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      }
    });

    if (!authResponse.ok) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const userData = await authResponse.json();
    req.user = userData; // makandir biha walo db 
    req.headers['x-user-id'] = userData.user.id;
    console.log('auth response : ', userData);
    console.log('userid', req.headers['x-user-id']);
  } catch (err) {
    console.log(authResponse);
    res.status(401).send({ error: 'Unauthorized: missing/invalid token' });
  }
}

const authenticateWs = async (request, reply) => {
  try {
    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        return [name, decodeURIComponent(rest.join('='))];
      })
    );

    const token = cookies.token;

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: missing token' });
    }

    const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`,
      },
    });

    if (!authResponse.ok) {
      return reply.status(401).send({ error: 'Unauthorized: invalid token' });
    }

    const userData = await authResponse.json();

    const url = new URL(request.url, `http://${request.headers.host}`);
    url.searchParams.set('userId', userData.user.id);
    request.raw.url = url.pathname + url.search;

    console.log('Updated request.raw.url:', request.raw.url);
  } catch (err) {
    console.error('WebSocket Auth Error:', err);
    return reply.status(401).send({ error: 'Unauthorized: authentication failed' });
  }
};


app.addHook('preHandler', async (request, reply) => {
  const publicRoutes = ['/api/auth/', '/health', '/metrics'];

  if (publicRoutes.some(route => request.url.startsWith(route))) return;

  if (request.url.startsWith('/ws/')) {
    await authenticateWs(request, reply);
  } else {
    await authenticateUser(request, reply);
  }
});


const createProxyWithHeaders = (upstream, prefix, rewritePrefix = prefix) => ({
  upstream,
  prefix,
  http2: false,
  rewritePrefix,
  replyOptions: {
    rewriteRequestHeaders: (originalReq, headers) => ({
      ...headers,
      'x-user-id': originalReq.headers['x-user-id'],
      'cookie': originalReq.headers['cookie']
    })
  }
});

app.register(proxy, {
  upstream: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  prefix: '/api/auth',
  rewritePrefix: '',
});

app.register(proxy, createProxyWithHeaders(
  process.env.USER_MANAGEMENT_SERVICE_URL || 'http://user-service:3002',
  '/api/user-management'
))

app.register(proxy, createProxyWithHeaders(
  process.env.CHAT_SERVICE_URL || 'http://chat-service:3004',
  '/api/chat'
));

app.register(proxy, {
  wsUpstream: process.env.CHAT_SERVICE_URL || 'ws://chat-service:3004',
  prefix: '/ws/chat',
  http2: false,
  rewritePrefix: '/ws/chat',
  websocket: true
});

app.get('/health', () => {
  return { message: 'healthy' };
});

app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
