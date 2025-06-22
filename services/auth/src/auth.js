import fastify from 'fastify';
import dotenv from 'dotenv';
import 'dotenv/config'
import { authRoutes } from './routes/auth.routes.js';
import jwt from '@fastify/jwt';
import oauth2 from '@fastify/oauth2';

const app = fastify({logger: true});

const GOOGLE_CONFIG = {
  name: 'google',
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: oauth2.GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/signup/google',
  callbackUri: `http://localhost:${process.env.AUTH_PORT}/api/auth/signup/google/callback`,
  scope: ['email', 'profile'],
}

dotenv.config();

app.register(oauth2, GOOGLE_CONFIG);
app.register(jwt, {secret: process.env.JWT_SECRET})



app.register(authRoutes, { prefix: '/api/auth' });

//Todo

// app.post('/login/')
// add password hashing with salting in signupVerifyCode
// add login

app.get('/health', () => {
  return { message: 'healthy' };
});

app.listen({ port: process.env.AUTH_PORT || 3001, host: '0.0.0.0' }, (error, address) => { 
    if (error) {
        app.log.error(error);
        process.exit(1);
    }

    app.log.info(`Server listening at ${address}`);
});
