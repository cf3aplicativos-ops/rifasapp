import { VentaEstado, type PrismaClient } from "./generated/client";

export class LiquidacionError extends Error {}

/**
 * Fase 19C: registro contable de comisión — marca las ventas PAGADAS de un
 * vendedor en un período como cubiertas (Venta.liquidacionId) y genera un
 * `Liquidacion` con el monto. El pago en sí lo hace el admin por fuera del
 * sistema (igual que ya pasa con ventas en efectivo) — esto solo deja
 * constancia de qué se liquidó y cuánto.
 *
 * No es doble-conteo: el filtro `liquidacionId: null` en la búsqueda de
 * ventas hace que una segunda llamada sobre el mismo período no encuentre
 * nada para liquidar de nuevo (tira LiquidacionError en vez de generar un
 * segundo registro con las mismas ventas).
 */
export async function crearLiquidacion(
  prisma: PrismaClient,
  params: {
    vendedorId: string;
    periodoDesde: Date;
    periodoHasta: Date;
    generadaPorId: string;
  },
) {
  const { vendedorId, periodoDesde, periodoHasta, generadaPorId } = params;

  const vendedor = await prisma.usuario.findUnique({ where: { id: vendedorId } });
  if (!vendedor) {
    throw new LiquidacionError("El vendedor no existe");
  }
  if (vendedor.comisionPct == null) {
    throw new LiquidacionError(
      "Este vendedor todavía no tiene un % de comisión configurado",
    );
  }

  const ventas = await prisma.venta.findMany({
    where: {
      vendedorId,
      estado: VentaEstado.PAGADA,
      liquidacionId: null,
      createdAt: { gte: periodoDesde, lte: periodoHasta },
    },
  });
  if (ventas.length === 0) {
    throw new LiquidacionError("No hay ventas pendientes de liquidar en ese período");
  }

  const comisionPct = Number(vendedor.comisionPct);
  const montoVentas = ventas.reduce((suma, venta) => suma + Number(venta.montoTotal), 0);
  const montoComision = Math.round(montoVentas * (comisionPct / 100) * 100) / 100;

  const liquidacion = await prisma.$transaction(async (tx) => {
    const nueva = await tx.liquidacion.create({
      data: {
        vendedorId,
        periodoDesde,
        periodoHasta,
        comisionPct,
        montoVentas,
        montoComision,
        cantidadVentas: ventas.length,
        generadaPorId,
      },
    });

    await tx.venta.updateMany({
      where: { id: { in: ventas.map((v) => v.id) } },
      data: { liquidacionId: nueva.id },
    });

    return nueva;
  });

  return liquidacion;
}
