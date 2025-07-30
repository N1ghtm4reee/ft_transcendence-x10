import fastifyPlugin from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function prismaPlugin(fastify, options) {
  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (fastifyInstance, done) => {
	await prisma.$disconnect();
	done();
  });
}

export default fastifyPlugin(prismaPlugin);