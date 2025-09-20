import fastify from "fastify";

export const signupSchema = {
  body: {
    type: "object",
    required: ["name", "password", "email"],
    properties: {
      name: {
        type: "string",
        minLength: 2,
        maxLength: 50,
        pattern: "^[a-zA-Z0-9\\s\\-_\\.]+$",
        description: "User full name",
      },
      password: {
        type: "string",
        minLength: 8,
        maxLength: 128,
        description: "User password (minimum 8 characters)",
      },
      email: {
        type: "string",
        format: "email",
        maxLength: 255,
        description: "User email address",
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: {
        message: { type: "string", example: "User created successfully" },
        user: {
          type: "object",
          properties: {
            id: { type: "integer", description: "User ID" },
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            name: { type: "string", description: "User full name" },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
          },
        },
      },
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string", example: "Validation failed" },
        message: {
          type: "string",
          example: "Request data does not match the required schema",
        },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", example: "email" },
              message: {
                type: "string",
                example: "Please provide a valid email address",
              },
              value: { description: "The invalid value that was provided" },
              constraint: { type: "string", example: "format" },
            },
          },
        },
        statusCode: { type: "integer", example: 400 },
      },
    },
    422: {
      type: "object",
      properties: {
        error: { type: "string", example: "Validation failed" },
        message: {
          type: "string",
          description: "Detailed validation error message",
        },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                description: "Field that failed validation",
              },
              message: {
                type: "string",
                description: "Validation error message",
              },
            },
          },
        },
      },
    },
    500: {
      type: "object",
      properties: {
        error: { type: "string", example: "Internal Server Error" },
      },
    },
  },
};

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        maxLength: 255,
        description: "User email address",
      },
      password: {
        type: "string",
        minLength: 1,
        maxLength: 128,
        description: "User password",
      },
      twoFactorToken: {
        type: "string",
        pattern: "^[0-9]{6}$",
        description: "6-digit 2FA code (if 2FA is enabled)",
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string", example: "Login successful" },
        user: {
          type: "object",
          properties: {
            id: { type: "integer", description: "User ID" },
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            name: { type: "string", description: "User full name" },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
          },
        },
      },
    },
    206: {
      type: "object",
      properties: {
        message: { type: "string", example: "2FA required" },
        requires2FA: { type: "boolean", example: true },
        tempToken: {
          type: "string",
          description: "Temporary token for 2FA verification",
        },
      },
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string", example: "Validation failed" },
        message: {
          type: "string",
          example: "Request data does not match the required schema",
        },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", example: "email" },
              message: {
                type: "string",
                example: "Please provide a valid email address",
              },
              value: { description: "The invalid value that was provided" },
              constraint: { type: "string", example: "format" },
            },
          },
        },
        statusCode: { type: "integer", example: 400 },
      },
    },
    401: {
      type: "object",
      properties: {
        error: { type: "string", example: "Invalid email or password" },
      },
    },
    500: {
      type: "object",
      properties: {
        error: { type: "string", example: "Internal Server Error" },
      },
    },
  },
};

export const userInfoSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "integer", description: "User ID" },
        email: {
          type: "string",
          format: "email",
          description: "User email address",
        },
        name: { type: "string", description: "User full name" },
        isVerified: {
          type: "boolean",
          description: "Whether user email is verified",
        },
        oauthProvider: {
          type: "string",
          enum: ["local", "google"],
          description: "Authentication provider used",
        },
        signupDate: {
          type: "string",
          format: "date-time",
          description: "User registration date",
        },
        twoFactorEnabled: {
          type: "boolean",
          description: "Whether 2FA is enabled",
        },
      },
    },
    401: {
      type: "object",
      properties: {
        error: { type: "string", example: "Not authenticated" },
      },
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string", example: "User not found" },
      },
    },
  },
};
