import { VentaEstado, BoletoEstado, type PrismaClient } from "./generated/client";

// Ventana por default que una Venta autocomprada (CLIENTE, sin pasarela)
// puede quedar PENDIENTE antes de considerarse vencida — configurable por
// env var (`RESERVA_TTL_HORAS`) en cada app de tenant sin necesitar redeploy
// de código, solo de la env var.
export const DEFAULT_RESERVA_TTL_HORAS = 48;

/**
 * Libera los boletos de ventas PENDIENTE que nadie confirmó ni anuló a
 * tiempo (ver Fase 6 en docs/ESTADO.md). No hay cron: cada app de tenant la
 * llama al principio de las páginas donde importa que la disponibilidad de
 * boletos esté al día (grillas de compra, listado de ventas) — es "lazy",
 * corre en el próximo request que toque esa rifa, no en el instante exacto
 * en que vence. Suficiente para el caso de uso (nadie necesita que un
 * boleto se libere al segundo) y evita meter infraestructura de cron que
 * cruce las DBs de todos los tenants desde una sola función.
 *
 * Devuelve la cantidad de ventas que venció, por si el caller quiere
 * loguear o mostrar algo — hoy ningún caller lo usa.
 */
export async function expirarVentasVencidas(
  prisma: PrismaClient,
  ttlHoras: number = DEFAULT_RESERVA_TTL_HORAS,
): Promise<number> {
  const limite = new Date(Date.now() - ttlHoras * 60 * 60 * 1000);

  const vencidas = await prisma.venta.findMany({
    where: { estado: VentaEstado.PENDIENTE, createdAt: { lt: limite } },
    select: { id: true },
  });
  if (vencidas.length === 0) return 0;

  const ids = vencidas.map((v) => v.id);
  await prisma.$transaction([
    prisma.venta.updateMany({
      where: { id: { in: ids } },
      data: { estado: VentaEstado.VENCIDA },
    }),
    prisma.boleto.updateMany({
      where: { ventaId: { in: ids }, estado: BoletoEstado.RESERVADO },
      data: { estado: BoletoEstado.DISPONIBLE, ventaId: null },
    }),
  ]);
  return ids.length;
}
