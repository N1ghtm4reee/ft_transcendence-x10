

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient();
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || prismaClientSingleton();

globalForPrisma.prisma = prisma;

export default prisma;