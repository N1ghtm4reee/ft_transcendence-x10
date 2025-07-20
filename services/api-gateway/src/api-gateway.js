import fastify from 'fastify';
import proxy from '@fastify/http-proxy';
import dotenv from 'dotenv';

dotenv.config();
const app = fastify({logger : true});



const authenticateUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ error: 'Unauthorized: missing/invalid token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ token })
    });
    if (!authResponse.ok) {
      return res.status(401).send({ error: "Unauthorized"});
    }
    
    const userData = await authResponse.json();
    req.user = userData; // makandir biha walo db 
    req.headers['x-user-id'] = userData.userId;
  } catch (err) {
    res.status(401).send({ error: 'Unauthorized: missing/invalid token' });
  }
}

const authenticateWs = async (request, reply) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) return reply.status(401).send({ error: 'Unauthorized: missing token' });
  
    try {
      const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token})
      });
      
      if (!authResponse.ok) return reply.status(401).send({ error: 'Unauthorized: invalid token' });
  
      const userData = await authResponse.json();

      url.searchParams.delete('token');
      url.searchParams.set('userId', userData.userId);

      console.log('befor request.raw.url', request.raw.url);

      request.raw.url = url.pathname + url.search;
      console.log('request.raw.url', request.raw.url);
      } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: authentication failed' });
      }
}

app.addHook('preHandler', async (request, reply) => {
  const publicRoutes = ['/api/auth/', '/health'];
  
  if (publicRoutes.some(route => request.routeOptions.url.startsWith(route))) return;

  // auth in api-gateway

  // if (request.routeOptions.url.startsWith('/ws/')) {
  //   await authenticateWs(request, reply);
  // } else {
  //   await authenticateUser(request, reply);
  // }
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
    })
  }
});


app.register(proxy,{
  upstream: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  prefix: '/api/auth',
  http2: false,
  rewritePrefix: '/api/auth',
})

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


app.listen({ port: process.env.API_GATEWAY_PORT, host:'0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
