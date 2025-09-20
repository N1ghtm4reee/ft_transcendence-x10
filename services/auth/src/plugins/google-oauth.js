import fastifyPlugin from "fastify-plugin";
import oauth2 from "@fastify/oauth2";

async function googleOAuthPlugin(fastify, options) {
  await fastify.register(oauth2, {
    name: "googleOAuth2",
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID || "",
        secret: process.env.GOOGLE_CLIENT_SECRET || "",
      },
      auth: oauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/google",
    callbackUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/google/callback",
    scope: ["profile", "email"],
  });
}

export default fastifyPlugin(googleOAuthPlugin);
