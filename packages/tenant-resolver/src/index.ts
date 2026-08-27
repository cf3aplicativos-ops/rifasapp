import { decryptConnectionString, getControlPrismaClient } from "@rifaxapp/db-control";
import { createTenantPrismaClient, type PrismaClient } from "@rifaxapp/db-tenant";

// Cacheado por tenantId a nivel de módulo — reusa la conexión entre llamadas
// dentro de la misma instancia serverless "warm". Sin límite de tamaño ni TTL
// por ahora; revisar si hace falta un LRU cuando haya muchos tenants activos
// al mismo tiempo en el mismo proceso.
const clientsByTenantId = new Map<string, PrismaClient>();

/**
 * Dado un tenantId (fila en el control-plane), descifra su connection string
 * y devuelve un PrismaClient conectado a la DB de ese tenant, cacheado.
 *
 * No resuelve el tenant por subdominio/Host todavía — eso llega en Fase 3,
 * cuando exista una app con middleware/proxy real que lo necesite.
 */
export async function getTenantPrismaClient(tenantId: string): Promise<PrismaClient> {
  const cached = clientsByTenantId.get(tenantId);
  if (cached) return cached;

  const controlPrisma = getControlPrismaClient();
  const tenant = await controlPrisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  if (!tenant.connectionStringCifrado) {
    throw new Error(`El tenant "${tenant.slug}" no tiene connection string guardado todavía`);
  }

  const connectionString = decryptConnectionString(tenant.connectionStringCifrado);
  const client = createTenantPrismaClient(connectionString);
  clientsByTenantId.set(tenantId, client);
  return client;
}

/**
 * Cierra y saca del cache el PrismaClient de un tenant, si existe uno.
 * Hay que llamarlo antes de borrar la base de datos de ese tenant (un
 * `DROP DATABASE` falla si queda una conexión cacheada todavía abierta).
 */
export async function evictTenantPrismaClient(tenantId: string): Promise<void> {
  const cached = clientsByTenantId.get(tenantId);
  if (!cached) return;
  clientsByTenantId.delete(tenantId);
  await cached.$disconnect();
}
