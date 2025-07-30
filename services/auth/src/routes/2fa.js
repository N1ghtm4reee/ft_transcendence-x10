import TwoFactorService from "../services/TwoFactorService.js";

async function twoFactorRoutes(fastify, options) {
  const authenticateUser = async (request, reply) => {
    try {
      const token = request.cookies.token;
      if (!token) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const decoded = fastify.jwt.verify(token);
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.id },
        include: { twoFactorAuth: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      request.user = user;
    } catch (error) {
      return reply.status(401).send({ error: "Invalid token" });
    }
  };

  fastify.post(
    "/2fa/setup",
    {
      schema: {
        tags: ["2FA"],
        summary: "Setup 2FA",
        description: "Generate secret and QR code for 2FA setup",
        security: [{ cookieAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              secret: { type: "string", description: "Base32 secret key" },
              qrCode: { type: "string", description: "Base64 QR code image" },
              backupCodes: {
                type: "array",
                items: { type: "string" },
                description: "Emergency backup codes",
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
      await authenticateUser(request, reply);
      if (reply.sent) return;

      try {
        const user = request.user;

        if (user.twoFactorAuth?.isEnabled) {
          return reply
            .status(400)
            .send({ error: "2FA is already enabled for this account" });
        }

        const secretData = TwoFactorService.generateSecret(
          user.email,
          user.name
        );
        const qrCode = await TwoFactorService.generateQRCode(
          secretData.otpauthUrl
        );
        const backupCodes = TwoFactorService.generateBackupCodes();

        await fastify.prisma.twoFactorAuth.upsert({
          where: { userId: user.id },
          update: {
            secretKey: secretData.secret,
            isEnabled: false,
          },
          create: {
            userId: user.id,
            secretKey: secretData.secret,
            isEnabled: false,
          },
        });

        return reply.send({
          secret: secretData.secret,
          qrCode: qrCode,
          backupCodes: backupCodes,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to setup 2FA" });
      }
    }
  );

  fastify.post(
    "/2fa/verify",
    {
      schema: {
        tags: ["2FA"],
        summary: "Verify and enable 2FA",
        description: "Verify TOTP token and enable 2FA for the account",
        security: [{ cookieAuth: [] }],
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              pattern: "^[0-9]{6}$",
              description: "6-digit TOTP code",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              enabled: { type: "boolean" },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      await authenticateUser(request, reply);
      if (reply.sent) return;

      try {
        const { token } = request.body;
        const user = request.user;

        if (!user.twoFactorAuth) {
          return reply
            .status(400)
            .send({ error: "2FA not set up. Please setup 2FA first." });
        }

        const isValid = TwoFactorService.verifyToken(
          token,
          user.twoFactorAuth.secretKey
        );

        if (!isValid) {
          return reply.status(400).send({ error: "Invalid 2FA token" });
        }

        await fastify.prisma.twoFactorAuth.update({
          where: { userId: user.id },
          data: { isEnabled: true },
        });

        return reply.send({
          message: "2FA has been successfully enabled",
          enabled: true,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to verify 2FA" });
      }
    }
  );

  fastify.post(
    "/2fa/disable",
    {
      schema: {
        tags: ["2FA"],
        summary: "Disable 2FA",
        description: "Disable 2FA for the account",
        security: [{ cookieAuth: [] }],
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              pattern: "^[0-9]{6}$",
              description: "6-digit TOTP code for verification",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              enabled: { type: "boolean" },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      await authenticateUser(request, reply);
      if (reply.sent) return;

      try {
        const { token } = request.body;
        const user = request.user;

        if (!user.twoFactorAuth?.isEnabled) {
          return reply.status(400).send({ error: "2FA is not enabled" });
        }

        const isValid = TwoFactorService.verifyToken(
          token,
          user.twoFactorAuth.secretKey
        );

        if (!isValid) {
          return reply.status(400).send({ error: "Invalid 2FA token" });
        }

        await fastify.prisma.twoFactorAuth.delete({
          where: { userId: user.id },
        });

        return reply.send({
          message: "2FA has been disabled",
          enabled: false,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to disable 2FA" });
      }
    }
  );

  fastify.get(
    "/2fa/status",
    {
      schema: {
        tags: ["2FA"],
        summary: "Get 2FA status",
        description: "Check if 2FA is enabled for the current user",
        security: [{ cookieAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              enabled: {
                type: "boolean",
                description: "Whether 2FA is enabled",
              },
              setup: {
                type: "boolean",
                description: "Whether 2FA is set up but not yet enabled",
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      await authenticateUser(request, reply);
      if (reply.sent) return;

      const user = request.user;
      const twoFA = user.twoFactorAuth;

      return reply.send({
        enabled: twoFA?.isEnabled || false,
        setup: !!twoFA && !twoFA.isEnabled,
      });
    }
  );
}

export default twoFactorRoutes;
