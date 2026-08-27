import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";

neonConfig.webSocketConstructor = ws;

/**
 * Crea un PrismaClient nuevo para la DB de un tenant específico. A diferencia
 * de `getControlPrismaClient` (db-control), esto NO se cachea acá — hay un
 * tenant distinto por connection string, así que el cacheo (por tenantId) es
 * responsabilidad de packages/tenant-resolver.
 */
export function createTenantPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}
