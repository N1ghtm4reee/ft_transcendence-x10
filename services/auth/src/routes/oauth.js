async function createNewProfile(userData) {
  console.log("createNewProfile for OAuth user");
  const userProfile = {
    id: userData.id,
    displayName: userData.name,
    avatar: userData.avatar || "assets/default.png",
    bio: "hey there! want to play a game?",
  };
  console.log("userProfile : ", userProfile);
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

async function oauthRoutes(fastify, options) {
  fastify.get(
    "/google/callback",
    {
      schema: {
        tags: ["OAuth"],
        summary: "Google OAuth callback",
        description: "Handle the callback from Google OAuth authentication",
        querystring: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Authorization code from Google",
            },
            state: {
              type: "string",
              description: "State parameter for security",
            },
          },
        },
        response: {
          200: {
            type: "string",
            description: "HTML page that communicates with parent window",
          },
        },
      },
    },
    async function (request, reply) {
      try {
        fastify.log.info("OAuth callback received", { query: request.query });

        if (!fastify.googleOAuth2) {
          throw new Error("Google OAuth2 instance not found");
        }
        fastify.log.info("OAuth code received", request.query);
        const { token } =
          await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
            request
          );

        fastify.log.info("Token received from Google");

        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
            },
          }
        );

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user info from Google");
        }

        const googleUser = await userResponse.json();

        let user = await fastify.prisma.user.findUnique({
          where: { email: googleUser.email },
          include: {
            twoFactorAuth: true,
          },
        });

        if (!user) {
          user = await fastify.prisma.user.create({
            data: {
              email: googleUser.email,
              name: googleUser.name,
              isVerified: true,
              oauthProvider: "google",
            },
            include: {
              twoFactorAuth: true,
            },
          });

          try {
            await createNewProfile(user);
            console.log(
              "Profile and game stats created for new Google OAuth user:",
              user.id
            );
          } catch (err) {
            console.error("Error creating profile for Google OAuth user", err);
          }
        } else {
          if (user.oauthProvider === "local") {
            user = await fastify.prisma.user.update({
              where: { id: user.id },
              data: { oauthProvider: "google" },
              include: {
                twoFactorAuth: true,
              },
            });
          }
        }

        const requires2FA = user.twoFactorAuth?.isEnabled || false;

        fastify.log.info(`User ${user.email} - 2FA check:`, {
          has2FA: !!user.twoFactorAuth,
          isEnabled: user.twoFactorAuth?.isEnabled,
          requires2FA: requires2FA,
        });

        console.log("=== 2FA DEBUG ===");
        console.log("User twoFactorAuth object:", user.twoFactorAuth);
        console.log("requires2FA:", requires2FA);
        console.log("About to check if requires2FA...");

        if (requires2FA) {
          console.log("2FA REQUIRED - Generating temp token...");
          const tempToken = fastify.jwt.sign(
            { id: user.id, email: user.email, temp: true },
            { expiresIn: "5m" }
          );

          console.log(
            "Temp token generated:",
            tempToken.substring(0, 20) + "..."
          );

          const twoFAHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>2FA Required</title>
            </head>
            <body>
              <script>
                console.log('OAuth popup: 2FA required');
                console.log('OAuth popup: Temp token:', '${tempToken}');
                console.log('OAuth popup: User data:', ${JSON.stringify({
                  id: user.id,
                  email: user.email,
                  name: user.name,
                })});
                
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_2FA_REQUIRED', 
                  tempToken: '${tempToken}',
                  user: ${JSON.stringify({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                  })}
                },  "${process.env.HTTP}://${process.env.FRONT_IP}:4000");
                console.log('OAuth popup: 2FA message sent, closing window');
                setTimeout(() => {
                  window.close();
                }, 1000);
              </script>
              <p>2FA verification required. This window will close automatically...</p>
            </body>
            </html>
          `;

          console.log("About to send 2FA HTML response...");
          return reply.type("text/html").send(twoFAHtml);
        }

        console.log("NO 2FA REQUIRED - Proceeding with normal login...");
        const jwtToken = fastify.jwt.sign({ id: user.id, email: user.email });

        reply.setCookie("token", jwtToken, {
          secure: false,
          sameSite: "lax",
          maxAge: 3600,
          path: "/",
        });

        const successHtml = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Authentication Successful</title>
				</head>
				<body>
					<script>
						console.log('OAuth popup: sending success message to parent');
						console.log('User data:', ${JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.name,
            })});
						window.opener.postMessage({ 
							type: 'GOOGLE_AUTH_SUCCESS', 
							user: ${JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name,
              })}
						}, "${process.env.HTTP}://${process.env.FRONT_IP}:4000");
						console.log('OAuth popup: message sent, closing window');
						setTimeout(() => {
							window.close();
						}, 1000);
					</script>
					<p>Authentication successful! This window will close automatically...</p>
				</body>
				</html>
			`;

        return reply.type("text/html").send(successHtml);
      } catch (error) {
        fastify.log.error({ err: error }, "OAuth callback error");

        const errorHtml = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Authentication Failed</title>
				</head>
				<body>
					<script>
						window.opener.postMessage({ 
							type: 'GOOGLE_AUTH_ERROR', 
							error: 'Authentication failed. Please try again.'
						}, "${process.env.HTTP}://${process.env.FRONT_IP}:4000");
						window.close();
					</script>
					<p>Authentication failed. This window will close automatically.</p>
				</body>
				</html>
			`;

        return reply.type("text/html").send(errorHtml);
      }
    }
  );

  // fastify.post(
  //   "/auth/logout",
  //   {
  //     schema: {
  //       tags: ["OAuth"],
  //       summary: "OAuth Logout",
  //       description: "Clear OAuth authentication cookie",
  //       security: [{ cookieAuth: [] }],
  //       response: {
  //         200: {
  //           type: "object",
  //           properties: {
  //             message: { type: "string" },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     reply.clearCookie("token");
  //     return reply.send({ message: "Logged out successfully" });
  //   }
  // );
}

export default oauthRoutes;
