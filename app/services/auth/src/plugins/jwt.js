import fastifyPlugin from "fastify-plugin";
import jwt from "@fastify/jwt";

async function jwtPlugin(fastify, options) {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "supersecret",
    sign: {
      expiresIn: "1h",
    },
  });

  await fastify.register(import("@fastify/cookie"));
}

export default fastifyPlugin(jwtPlugin);
