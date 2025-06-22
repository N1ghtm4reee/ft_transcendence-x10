import {authControllers} from '../controllers/auth.controllers.js';
import {authSchemas} from '../schemas/auth.schema.js';
// import {createErrorResponse} from '../utils/errorHandler.js';

export const authRoutes = async (app, options) => {

    app.post('/verify', {
        schema: authSchemas.verifyTokenSchema,
        handler: authControllers.verifyToken
    });
    app.post('/signup/local/verification-request', {
        schema: authSchemas.signupSendCodeSchema,
        handler: authControllers.signupSendCode
    });

    app.post('/signup/local', {
        schema: authSchemas.signupSchema,
        handler: authControllers.signupVerifyCode
    });

    app.get('/signup/google/callback', authControllers.signupGoogleCallback);
}
