import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import path from "node:path";
import ws from "ws";
import { PrismaClient } from "./generated/client";

neonConfig.webSocketConstructor = ws;

/**
 * Bug real en producción (Fase 11): con el `output` propio de este package
 * (necesario para no chocar con el cliente de db-control), la búsqueda que
 * hace Prisma del motor de consultas en Vercel mezcla rutas de build-time
 * ("/vercel/path0/...") con las de runtime ("/var/task/...") y nunca da con
 * dónde termina realmente el archivo — confirmado con un endpoint de debug
 * temporal que listó el filesystem real del lambda desplegado. `binaryTargets`
 * explícito (en el schema) y `outputFileTracingRoot`/`outputFileTracingIncludes`
 * (en cada next.config.ts) ya garantizan que el binario SÍ viaja en el
 * deploy — el problema es solo que Prisma no adivina bien dónde buscarlo.
 *
 * Se le indica la ruta exacta a mano vía la opción interna
 * `__internal.engine.binaryPath` del constructor de PrismaClient — a
 * diferencia de la env var `PRISMA_QUERY_ENGINE_LIBRARY`, esto es por
 * instancia, así que no interfiere con el cliente de db-control (que usa la
 * ubicación default de @prisma/client y nunca tuvo este problema). En cada
 * función serverless de Vercel, `process.cwd()` es `/var/task/apps/<app>`
 * (confirmado), así que subir dos niveles llega al monorepo. Solo aplica en
 * Vercel — en dev local (Windows) Prisma ya resuelve bien su propio motor.
 */
function engineBinaryPathOverride(): string | undefined {
  if (!process.env.VERCEL) return undefined;
  return path.join(
    process.cwd(),
    "../../packages/db-tenant/src/generated/client/libquery_engine-rhel-openssl-3.0.x.so.node",
  );
}

/**
 * Crea un PrismaClient nuevo para la DB de un tenant específico. A diferencia
 * de `getControlPrismaClient` (db-control), esto NO se cachea acá — hay un
 * tenant distinto por connection string, así que el cacheo (por tenantId) es
 * responsabilidad de packages/tenant-resolver.
 */
export function createTenantPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaNeon({ connectionString });
  const binaryPath = engineBinaryPathOverride();
  const options = {
    adapter,
    ...(binaryPath ? { __internal: { engine: { binaryPath } } } : {}),
    // El tipo generado de PrismaClientOptions no declara __internal (es una
    // opción interna de Prisma, no pensada para uso público) — el `as`
    // acá abajo es a propósito, ver la nota larga arriba.
  } as ConstructorParameters<typeof PrismaClient>[0];
  return new PrismaClient(options);
}
