import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  controlPrisma?: PrismaClient;
};

export function getControlPrismaClient(): PrismaClient {
  if (!globalForPrisma.controlPrisma) {
    const adapter = new PrismaNeon({ connectionString: process.env.POSTGRES_PRISMA_URL });
    globalForPrisma.controlPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.controlPrisma;
}
