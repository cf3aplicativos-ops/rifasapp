import {
  RifaEstado,
  BoletoEstado,
  VentaEstado,
  MetodoPago,
  type PrismaClient,
} from "./generated/client";

/**
 * Ciclo de vida de una Venta, compartido entre las apps de tenant y el
 * webhook de la pasarela de pago (Fase 8) — el webhook no tiene sesión ni
 * RBAC, así que necesita ejecutar EXACTAMENTE las mismas transacciones que
 * ya corren las Server Actions de apps/admin y apps/clientes, sin duplicar
 * la lógica en un tercer lugar. Cada función acá abajo asume que el RBAC ya
 * se resolvió del lado del caller (assertRole en la Server Action, o la
 * verificación de firma del webhook).
 */

export class VentaLifecycleError extends Error {}

type NumerosSeleccionados = number[];

/**
 * Crea una Venta PENDIENTE para un CLIENTE (o, en teoría, cualquier canal
 * que reserve a nombre de un comprador con cuenta) y reserva los boletos
 * elegidos, protegido contra condición de carrera: la selección compite con
 * cualquier otra venta/reserva simultánea vía un `updateMany` condicionado a
 * `DISPONIBLE` dentro de una transacción interactiva — si algún boleto ya
 * no está disponible, aborta y tira (rollback automático).
 */
export async function reservarBoletosParaVenta(
  prisma: PrismaClient,
  params: {
    rifaId: string;
    clienteId: string;
    numeros: NumerosSeleccionados;
    metodoPago: MetodoPago;
  },
): Promise<{ ventaId: string; montoTotal: number }> {
  const { rifaId, clienteId, numeros, metodoPago } = params;

  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== RifaEstado.ACTIVA) {
    throw new VentaLifecycleError("La rifa no está activa");
  }

  const boletos = await prisma.boleto.findMany({ where: { rifaId, numero: { in: numeros } } });
  if (boletos.length !== numeros.length) {
    throw new VentaLifecycleError("Alguno de los números elegidos no existe");
  }
  const boletoIds = boletos.map((b) => b.id);
  const montoTotal = Number(rifa.precioBoleto) * numeros.length;

  let ventaId = "";
  await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: { rifaId, clienteId, montoTotal, metodoPago, estado: VentaEstado.PENDIENTE },
    });
    ventaId = venta.id;

    const { count } = await tx.boleto.updateMany({
      where: { id: { in: boletoIds }, estado: BoletoEstado.DISPONIBLE },
      data: { estado: BoletoEstado.RESERVADO, ventaId: venta.id },
    });

    if (count !== boletoIds.length) {
      throw new VentaLifecycleError("Algunos números ya no están disponibles, refrescá la página");
    }
  });

  return { ventaId, montoTotal };
}

/** PENDIENTE → PAGADA, boletos RESERVADO → VENDIDO. */
export async function confirmarPagoDeVenta(prisma: PrismaClient, ventaId: string): Promise<void> {
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta || venta.estado !== VentaEstado.PENDIENTE) {
    throw new VentaLifecycleError("Solo se puede confirmar una venta en estado PENDIENTE");
  }

  await prisma.$transaction([
    prisma.venta.update({ where: { id: ventaId }, data: { estado: VentaEstado.PAGADA } }),
    prisma.boleto.updateMany({
      where: { ventaId, estado: BoletoEstado.RESERVADO },
      data: { estado: BoletoEstado.VENDIDO },
    }),
  ]);
}

/** PENDIENTE → ANULADA, boletos RESERVADO liberados a DISPONIBLE. */
export async function anularVentaPendiente(prisma: PrismaClient, ventaId: string): Promise<void> {
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta || venta.estado !== VentaEstado.PENDIENTE) {
    throw new VentaLifecycleError("Solo se puede anular una venta en estado PENDIENTE");
  }

  await prisma.$transaction([
    prisma.venta.update({ where: { id: ventaId }, data: { estado: VentaEstado.ANULADA } }),
    prisma.boleto.updateMany({
      where: { ventaId, estado: BoletoEstado.RESERVADO },
      data: { estado: BoletoEstado.DISPONIBLE, ventaId: null },
    }),
  ]);
}
