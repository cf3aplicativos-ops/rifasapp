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

type BoletoVendible = {
  numero: number;
  asignadoASedeId: string | null;
  asignadoAVendedorId: string | null;
};

/**
 * Fase 19B: valida que cada boleto pueda venderse por el canal que lo está
 * pidiendo, antes de tocar la DB. Boletos sin dueño (asignadoASedeId y
 * asignadoAVendedorId ambos null) siempre se pueden vender — es el default
 * de todo lo que existía antes de esta fase, cero fricción para tenants que
 * no usan asignación.
 *
 * - `vendedorId` presente (venta directa de un VENDEDOR): puede vender lo
 *   suyo y lo libre; lo de otro vendedor o de la sede, no (tiene que pedirlo
 *   prestado vía SolicitudTraspaso primero).
 * - `vendedorId` ausente (reserva de un CLIENTE, incluido el webhook de
 *   Wompi): solo puede tocar boletos libres — cualquier boleto ya asignado
 *   (a una sede o a un vendedor) queda reservado para ese canal.
 */
export function assertBoletosVendibles(boletos: BoletoVendible[], vendedorId?: string): void {
  for (const boleto of boletos) {
    if (!vendedorId) {
      if (boleto.asignadoAVendedorId || boleto.asignadoASedeId) {
        throw new VentaLifecycleError(
          `El boleto #${boleto.numero} está reservado, no disponible para compra directa`,
        );
      }
      continue;
    }
    if (boleto.asignadoAVendedorId && boleto.asignadoAVendedorId !== vendedorId) {
      throw new VentaLifecycleError(`El boleto #${boleto.numero} está asignado a otro vendedor`);
    }
    if (!boleto.asignadoAVendedorId && boleto.asignadoASedeId) {
      throw new VentaLifecycleError(`El boleto #${boleto.numero} está asignado a la sede, no a vos`);
    }
  }
}

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
  assertBoletosVendibles(boletos);
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

/**
 * Fase 19B: venta directa "en persona" de un VENDEDOR — a diferencia de
 * reservarBoletosParaVenta (que crea una Venta PENDIENTE para que alguien
 * más confirme el pago), acá la Venta nace PAGADA porque el vendedor ya
 * cobró en el momento. Extraída de apps/vendedores/.../rifas/actions.ts
 * (antes vivía inline ahí) para poder aplicar assertBoletosVendibles en un
 * solo lugar, igual que reservarBoletosParaVenta.
 */
export async function venderBoletosComoVendedor(
  prisma: PrismaClient,
  params: {
    rifaId: string;
    vendedorId: string;
    numeros: NumerosSeleccionados;
    compradorNombre: string;
    compradorTelefono: string | null;
    metodoPago: MetodoPago;
  },
): Promise<{ ventaId: string; montoTotal: number }> {
  const { rifaId, vendedorId, numeros, compradorNombre, compradorTelefono, metodoPago } = params;

  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== RifaEstado.ACTIVA) {
    throw new VentaLifecycleError("La rifa no está activa");
  }

  const boletos = await prisma.boleto.findMany({ where: { rifaId, numero: { in: numeros } } });
  if (boletos.length !== numeros.length) {
    throw new VentaLifecycleError("Alguno de los números elegidos no existe");
  }
  assertBoletosVendibles(boletos, vendedorId);
  const boletoIds = boletos.map((b) => b.id);
  const montoTotal = Number(rifa.precioBoleto) * numeros.length;

  let ventaId = "";
  await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: {
        rifaId,
        vendedorId,
        compradorNombre,
        compradorTelefono,
        montoTotal,
        metodoPago,
        estado: VentaEstado.PAGADA,
      },
    });
    ventaId = venta.id;

    const { count } = await tx.boleto.updateMany({
      where: { id: { in: boletoIds }, estado: BoletoEstado.DISPONIBLE },
      data: { estado: BoletoEstado.VENDIDO, ventaId: venta.id },
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
