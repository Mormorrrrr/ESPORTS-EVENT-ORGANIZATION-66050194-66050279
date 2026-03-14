import { PrismaClient } from '@prisma/client';

// Use a singleton pattern to ensure we don't create multiple Prisma instances
// in development when the server hot-reloads
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;
