/**
 * Funciones puras de agregación para los dashboards ejecutivos (Fase 18).
 * Separadas de cualquier query de Prisma a propósito — cada `page.tsx` hace
 * su propio `findMany`/`groupBy` (mismo patrón que `reportes/page.tsx`,
 * intencionalmente sin compartir código con esa página, ver docs/ESTADO.md)
 * y le pasa a estas funciones datos ya "planos" (números, no `Decimal` de
 * Prisma) — así se testean sin DB ni mocks de Prisma.
 *
 * Simplificación consciente: el bucketing por día usa la fecha en UTC
 * (`toISOString().slice(0, 10)`), no la zona horaria local del tenant — no
 * hay manejo de timezone en ningún otro lado del repo hoy (`reportes.tsx`
 * solo usa `toLocaleDateString` para mostrar, no para agrupar), así que no
 * se introduce acá; alcanza para un dashboard de tendencia, no para un
 * reporte contable exacto por día calendario local.
 */

export type VentaMetrica = {
  createdAt: Date;
  monto: number;
  vendedorLabel: string;
};

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Serie diaria zero-filled de los últimos `dias` días (incluye hoy), para
 * un `AreaChart` de recaudación en el tiempo. Sin esto, un día sin ventas
 * simplemente no aparecería en el gráfico en vez de mostrar $0 — con
 * zero-fill el chart siempre tiene `dias` puntos, sin huecos.
 */
export function bucketVentasPorDia(
  ventas: VentaMetrica[],
  dias: number,
  hoy: Date = new Date(),
): { fecha: string; valor: number }[] {
  const porDia = new Map<string, number>();
  for (const v of ventas) {
    const key = fechaISO(v.createdAt);
    porDia.set(key, (porDia.get(key) ?? 0) + v.monto);
  }

  const serie: { fecha: string; valor: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setUTCDate(d.getUTCDate() - i);
    const key = fechaISO(d);
    serie.push({ fecha: key.slice(5), valor: porDia.get(key) ?? 0 });
  }
  return serie;
}

/**
 * % de cambio entre los últimos 7 días y los 7 días anteriores a esos —
 * para la píldora de tendencia de `Stat`. Si la semana anterior no tuvo
 * ventas, se evita la división por cero: 100% si hubo algo esta semana,
 * 0% si tampoco hubo nada (no hay "cambio" real que reportar).
 */
export function calcularDeltaSemanal(
  ventas: VentaMetrica[],
  hoy: Date = new Date(),
): number {
  const finActual = new Date(hoy);
  finActual.setUTCHours(23, 59, 59, 999);
  const inicioActual = new Date(finActual);
  inicioActual.setUTCDate(inicioActual.getUTCDate() - 6);
  inicioActual.setUTCHours(0, 0, 0, 0);

  const finAnterior = new Date(inicioActual);
  finAnterior.setUTCDate(finAnterior.getUTCDate() - 1);
  finAnterior.setUTCHours(23, 59, 59, 999);
  const inicioAnterior = new Date(finAnterior);
  inicioAnterior.setUTCDate(inicioAnterior.getUTCDate() - 6);
  inicioAnterior.setUTCHours(0, 0, 0, 0);

  let actual = 0;
  let anterior = 0;
  for (const v of ventas) {
    if (v.createdAt >= inicioActual && v.createdAt <= finActual)
      actual += v.monto;
    else if (v.createdAt >= inicioAnterior && v.createdAt <= finAnterior)
      anterior += v.monto;
  }

  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
}

/**
 * Ranking de vendedores por monto vendido, top-N descendente. Empates
 * quedan en el orden en que Prisma los devolvió (`Array.sort` es estable
 * en motores JS modernos) — no hay un criterio de desempate de negocio
 * definido, no se inventa uno.
 */
export function rankearVendedores(
  ventas: VentaMetrica[],
  topN = 5,
): { label: string; value: number }[] {
  const porVendedor = new Map<string, number>();
  for (const v of ventas) {
    porVendedor.set(
      v.vendedorLabel,
      (porVendedor.get(v.vendedorLabel) ?? 0) + v.monto,
    );
  }
  return Array.from(porVendedor.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

const ESTADOS_BOLETO = ["DISPONIBLE", "RESERVADO", "VENDIDO"] as const;

/**
 * Rellena con 0 los estados de boleto que Prisma `groupBy` no devuelve
 * porque no hay filas en ese estado (ej. una rifa recién creada no tiene
 * ningún boleto VENDIDO todavía — sin este relleno, ese estado
 * directamente no aparecería en la dona en vez de mostrar 0%).
 */
export function agruparBoletosPorEstado(
  counts: { estado: string; count: number }[],
): { estado: (typeof ESTADOS_BOLETO)[number]; count: number }[] {
  const porEstado = new Map(counts.map((c) => [c.estado, c.count]));
  return ESTADOS_BOLETO.map((estado) => ({
    estado,
    count: porEstado.get(estado) ?? 0,
  }));
}
