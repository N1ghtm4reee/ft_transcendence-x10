import fastifyPlugin from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

async function swaggerPlugin(fastify, options) {
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Auth DanDan API",
        description: "A simple authentication system with Google OAuth",
        version: "1.0.0",
        contact: {
          name: "Auth DanDan",
          email: "support@authdandan.com",
        },
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token",
            description: "JWT token stored in httpOnly cookie",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "integer", description: "User ID" },
              email: {
                type: "string",
                format: "email",
                description: "User email",
              },
              name: { type: "string", description: "User full name" },
              signupDate: {
                type: "string",
                format: "date-time",
                description: "User registration date",
              },
              isVerified: {
                type: "boolean",
                description: "Whether user email is verified",
              },
              oauthProvider: {
                type: "string",
                enum: ["local", "google"],
                description: "Authentication provider",
              },
            },
          },
          SignupRequest: {
            type: "object",
            required: ["name", "email", "password"],
            properties: {
              name: {
                type: "string",
                minLength: 2,
                maxLength: 50,
                description: "User full name",
              },
              email: {
                type: "string",
                format: "email",
                description: "User email address",
              },
              password: {
                type: "string",
                minLength: 6,
                description: "User password",
              },
            },
          },
          LoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: {
                type: "string",
                format: "email",
                description: "User email address",
              },
              password: { type: "string", description: "User password" },
            },
          },
          AuthResponse: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
              user: { $ref: "#/components/schemas/User" },
            },
          },
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string", description: "Error message" },
            },
          },
        },
      },
      tags: [
        {
          name: "Authentication",
          description: "User authentication endpoints",
        },
        {
          name: "OAuth",
          description: "Google OAuth authentication",
        },
        {
          name: "User",
          description: "User profile endpoints",
        },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
}

export default fastifyPlugin(swaggerPlugin);
