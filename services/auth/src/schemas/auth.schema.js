
export const authSchemas = {
    signupSendCodeSchema: {
        body: {
            type: 'object',
            required: ['email', 'password', 'name'],
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                name: { type: 'string', minLength: 1 }
            }
        }
    },

    signupVerifyCodeSchema: {
        body: {
            type: 'object',
            required: ['token', 'code'],
            properties: {
                token: { type: 'string' },
                code: { type: 'string', pattern: '^\\d{6}$' } // 6-digit code
            }
        }
    },
    verifyTokenSchema: {
        body: {
            type: 'object',
            required: ['token'],
            properties: {
                token: { type: 'string' }
            }
        }
    }
}