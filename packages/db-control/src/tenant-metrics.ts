/**
 * Funciones puras de agregación para el bloque ejecutivo de `/tenants` en
 * superadmin (Fase 18) — mismo espíritu que `dashboard-metrics.ts` de
 * `db-tenant`: reciben datos ya traídos por `page.tsx` (el mismo
 * `prisma.tenant.findMany()` que esa página ya hacía, sin queries nuevas),
 * no tocan Prisma directo, se testean sin DB.
 *
 * Deliberadamente NO cruza las DBs físicas de cada tenant (recaudación
 * global de la plataforma, etc.) — ver la decisión de alcance de Fase 18 en
 * docs/ESTADO.md, es una pieza de infraestructura más grande que un pulido
 * visual. Todo acá sale de `Tenant` en la DB de control-plane.
 */

export type TenantMetrica = { estado: string; createdAt: Date };

export function contarTenantsPorEstado(
  tenants: TenantMetrica[],
): Record<string, number> {
  const conteos: Record<string, number> = {
    PROVISIONANDO: 0,
    ACTIVO: 0,
    SUSPENDIDO: 0,
    ERROR: 0,
  };
  for (const t of tenants) {
    conteos[t.estado] = (conteos[t.estado] ?? 0) + 1;
  }
  return conteos;
}

/**
 * Tenants creados por mes, últimos `meses` meses (zero-filled, mismo
 * criterio que `bucketVentasPorDia` de `db-tenant`) — para el bar chart
 * chico arriba de la tabla de `/tenants`.
 */
export function bucketTenantsPorMes(
  tenants: TenantMetrica[],
  meses: number,
  hoy: Date = new Date(),
): { label: string; value: number }[] {
  const porMes = new Map<string, number>();
  for (const t of tenants) {
    const key = `${t.createdAt.getUTCFullYear()}-${String(t.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    porMes.set(key, (porMes.get(key) ?? 0) + 1);
  }

  const MESES_LABEL = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  const serie: { label: string; value: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1),
    );
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    serie.push({
      label: MESES_LABEL[d.getUTCMonth()]!,
      value: porMes.get(key) ?? 0,
    });
  }
  return serie;
}
