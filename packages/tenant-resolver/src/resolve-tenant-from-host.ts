import { getControlPrismaClient, TenantEstado } from "@rifaxapp/db-control";

// Dominio base sin subdominio de tenant (dev: "localhost"; prod, una vez
// exista el dominio: "rifaxapp.com" vía TENANT_BASE_DOMAIN). No basta con
// contar labels del host — "rifaxapp.com" y "acme.rifaxapp.com" tienen que
// distinguirse por el dominio base conocido, no por cantidad de puntos.
const DEFAULT_BASE_DOMAIN = "localhost";

function getBaseDomain(): string {
  return process.env.TENANT_BASE_DOMAIN || DEFAULT_BASE_DOMAIN;
}

/**
 * Extrae el subdominio de tenant de un host, dado el dominio base conocido
 * (`getBaseDomain()`). "acme.localhost:3001" -> "acme" (dev). Una vez exista
 * el dominio real, "acme.rifaxapp.com" -> "acme" con TENANT_BASE_DOMAIN=
 * "rifaxapp.com". El host base solo (sin subdominio) -> null, no hay tenant.
 */
export function extractSlugFromHost(host: string, baseDomain: string = getBaseDomain()): string | null {
  const hostname = (host.split(":")[0] ?? "").toLowerCase();
  if (!hostname || hostname === baseDomain) return null;

  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const slug = hostname.slice(0, -suffix.length);
  return slug || null;
}

/**
 * Fase 13 (Multi Zones): `admin`/`vendedores` reciben requests reenviadas
 * por el rewrite de `apps/clientes` (ver su next.config.ts) — en ese caso su
 * propio `Host` es el de su deploy de Vercel, no el subdominio del tenant
 * que el usuario visitó. Next.js reenvía el host original en
 * `X-Forwarded-Host` en ese escenario (mismo header que usa internamente
 * para el chequeo CSRF de Server Actions, ver `serverActions.allowedOrigins`
 * en esos `next.config.ts`) — hay que preferirlo por sobre `Host` acá
 * también. `apps/clientes` (la zona raíz, sin proxy de por medio) no lo
 * necesita — su `Host` ya es el correcto.
 */
export function resolveRequestHost(headersList: Headers): string {
  return headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
}

export type ResolvedTenant = { id: string; slug: string };

/**
 * Resuelve el tenant a partir del header Host de la request. Solo devuelve
 * un tenant si existe Y está ACTIVO — uno en PROVISIONANDO/ERROR no debe
 * dejar loguearse a nadie todavía.
 */
export async function resolveTenantFromHost(host: string): Promise<ResolvedTenant | null> {
  const slug = extractSlugFromHost(host);
  if (!slug) return null;

  const prisma = getControlPrismaClient();
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.estado !== TenantEstado.ACTIVO) return null;

  return { id: tenant.id, slug: tenant.slug };
}
