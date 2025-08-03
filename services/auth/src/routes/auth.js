import argon2 from "argon2";
import { signupSchema, loginSchema, userInfoSchema } from "./schema.js";
import TwoFactorService from "../services/TwoFactorService.js";

// controller
async function createNewProfile(userData) {
  const userProfile = {
    id: userData.id,
    displayName: userData.name,
    avatar: userData.avatar || "/app/assets/default.png",
    bio: "hey there! want to play a game?",
  };

  // should be internal service call
  const profileResponse = await fetch(
    "http://user-service:3002/api/user-management/profiles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userProfile }),
    }
  );

  if (!profileResponse.ok) {
    throw new Error("Failed to create user profile");
  }
}

async function initGameStats(userData){
  
}

async function authRoutes(fastify, options) {
  fastify.post(
    "/signup",
    {
      schema: {
        ...signupSchema,
        tags: ["Authentication"],
        summary: "Register a new user",
        description: "Create a new user account with email and password",
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      if (!email || !password || !name) {
        return reply
          .status(400)
          .send({ error: "Email, password, and name are required" });
      }

      try {
        // need to add email or username 
        const existingUser = await fastify.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply.status(400).send({ error: "User already exists" });
        }

        const hashedPassword = await argon2.hash(password);

        const user = await fastify.prisma.user.create({
          data: {
            email,
            name,
            passwordHash: hashedPassword,
          },
        });

        try {
          await createNewProfile(user);
        } catch (err) {
          console.error("Error calling user service", err);
        }

        console.log('user id : ' + user.id);
        const token = fastify.jwt.sign({ id: user.id, email: user.email });

        reply.setCookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 3600,
          path: "/",
        });

        return reply.status(201).send({
          message: "User created successfully",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        console.log(error);
        return reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  );

  fastify.post(
    "/login",
    {
      schema: {
        ...loginSchema,
        tags: ["Authentication"],
        summary: "Login user",
        description:
          "Authenticate user with email and password (and 2FA if enabled)",
      },
    },
    async (request, reply) => {
      const { email, password, twoFactorToken } = request.body;

      if (!email || !password) {
        return reply
          .status(400)
          .send({ error: "Email and password are required" });
      }

      try {
        const user = await fastify.prisma.user.findUnique({
          where: { email },
          include: { twoFactorAuth: true },
        });

        if (!user || !user.passwordHash) {
          return reply.status(401).send({ error: "Invalid email or password" });
        }

        const isPasswordValid = await argon2.verify(
          user.passwordHash,
          password
        );
        if (!isPasswordValid) {
          return reply.status(401).send({ error: "Invalid email or password" });
        }

        if (user.twoFactorAuth?.isEnabled) {
          if (!twoFactorToken) {
            const tempToken = fastify.jwt.sign(
              { id: user.id, email: user.email, temp: true },
              { expiresIn: "5m" }
            );

            return reply.status(206).send({
              message: "2FA required",
              requires2FA: true,
              tempToken: tempToken,
            });
          }

          const isValidToken = TwoFactorService.verifyToken(
            twoFactorToken,
            user.twoFactorAuth.secretKey
          );

          if (!isValidToken) {
            return reply.status(401).send({ error: "Invalid 2FA token" });
          }
        }

        const token = fastify.jwt.sign({ id: user.id, email: user.email });

        reply.setCookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 3600,
          path: "/",
        });

        return reply.status(200).send({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  );

  fastify.post(
    "/login/2fa",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Complete 2FA login",
        description: "Complete login process with 2FA token",
        body: {
          type: "object",
          required: ["tempToken", "twoFactorToken"],
          properties: {
            tempToken: {
              type: "string",
              description: "Temporary token from initial login",
            },
            twoFactorToken: {
              type: "string",
              pattern: "^[0-9]{6}$",
              description: "6-digit 2FA code",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  email: { type: "string" },
                  name: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { tempToken, twoFactorToken } = request.body;

      try {
        const decoded = fastify.jwt.verify(tempToken);
        if (!decoded.temp) {
          return reply.status(401).send({ error: "Invalid temporary token" });
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: decoded.id },
          include: { twoFactorAuth: true },
        });

        if (!user || !user.twoFactorAuth?.isEnabled) {
          return reply
            .status(401)
            .send({ error: "2FA not enabled for this account" });
        }

        const isValidToken = TwoFactorService.verifyToken(
          twoFactorToken,
          user.twoFactorAuth.secretKey
        );

        if (!isValidToken) {
          return reply.status(401).send({ error: "Invalid 2FA token" });
        }

        const token = fastify.jwt.sign({ id: user.id, email: user.email });

        reply.setCookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 3600,
          path: "/",
        });

        return reply.status(200).send({
          message: "2FA login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(401)
          .send({ error: "Invalid or expired temporary token" });
      }
    }
  );

  fastify.get(
    "/user",
    {
      schema: {
        ...userInfoSchema,
        tags: ["User"],
        summary: "Get current user info",
        description:
          "Get the currently authenticated user's profile information",
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        console.log("=== /user endpoint called ===");
        console.log("All cookies:", request.cookies);
        console.log("Raw cookie header:", request.headers.cookie);

        const token = request.cookies.token;
        console.log("JWT token:", token ? "Present" : "Missing");

        if (!token) {
          console.log("No token found - returning 401");
          return reply.status(401).send({ error: "Not authenticated" });
        }

        console.log("Attempting to verify JWT token...");
        const decoded = fastify.jwt.verify(token);
        console.log("JWT decoded successfully:", decoded);

        const user = await fastify.prisma.user.findUnique({
          where: { id: decoded.id },
          include: {
            twoFactorAuth: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        console.log("User found in database:", user);

        const responseData = {
          id: user.id,
          email: user.email,
          name: user.name,
          signupDate: user.createdAt
            ? user.createdAt.toISOString()
            : new Date().toISOString(),
          isVerified: user.isVerified,
          oauthProvider: user.oauthProvider,
          twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
        };

        console.log("Sending response:", responseData);

        return reply.send(responseData);
      } catch (error) {
        console.log("JWT verification failed:", error.message);
        fastify.log.error(error);
        return reply.status(401).send({ error: "Invalid token" });
      }
    }
  );

  fastify.post(
    "/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Logout user",
        description: "Clear the authentication cookie and logout the user",
        security: [{ cookieAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      reply.clearCookie("token");
      return reply.send({ message: "Logged out successfully" });
    }
  );

fastify.get(
  "/verify",
  {
    schema: {
      tags: ["Authentication"],
      summary: "Verify JWT Token from Cookie",
      description: "Verifies the JWT token from cookies and returns user info",
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "number" },
                email: { type: "string" },
              },
            },
          },
        },
        401: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  async (req, res) => {
    try {
      const token = req.cookies?.token;

      if (!token) {
        return res.status(401).send({ message: "Token not found in cookies" });
      }

      const decoded = fastify.jwt.verify(token);
      console.log("decoded:", decoded);

      return res.send({
        message: "Token is valid",
        user: {
          id: decoded.id,
          email: decoded.email,
        },
      });
    } catch (error) {
      return res.status(401).send({ message: "Invalid or expired token" });
    }
  }
);

}

export default authRoutes;
