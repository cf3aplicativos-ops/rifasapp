import { AsignacionModo, TraspasoEstado, UsuarioRol, type PrismaClient } from "./generated/client";

export class TraspasoError extends Error {}

/**
 * Fase 19B: un vendedor o una sede (a través de su SEDE_ADMIN) pide que le
 * traspasen un número que hoy tiene otro dueño. Snapshotea quién lo tenía
 * al momento del pedido (poseedorId/poseedorSedeId) — si el boleto cambia
 * de dueño por otro camino mientras esta solicitud sigue pendiente, la
 * resolución igual actúa sobre el boleto actual (ver resolverTraspaso).
 */
export async function solicitarTraspaso(
  prisma: PrismaClient,
  params: { rifaId: string; numero: number; solicitanteId: string },
) {
  const { rifaId, numero, solicitanteId } = params;

  const boleto = await prisma.boleto.findUnique({ where: { rifaId_numero: { rifaId, numero } } });
  if (!boleto) {
    throw new TraspasoError("Ese número no existe en esta rifa");
  }
  if (!boleto.asignadoASedeId && !boleto.asignadoAVendedorId) {
    throw new TraspasoError("Ese número está libre — no hace falta pedirlo prestado");
  }
  if (boleto.asignadoAVendedorId === solicitanteId) {
    throw new TraspasoError("Ese número ya es tuyo");
  }

  const yaPendiente = await prisma.solicitudTraspaso.findFirst({
    where: { boletoId: boleto.id, estado: TraspasoEstado.PENDIENTE },
  });
  if (yaPendiente) {
    throw new TraspasoError("Ya hay una solicitud pendiente para este número");
  }

  return prisma.solicitudTraspaso.create({
    data: {
      boletoId: boleto.id,
      rifaId,
      numero,
      solicitanteId,
      poseedorId: boleto.asignadoAVendedorId,
      poseedorSedeId: boleto.asignadoASedeId,
      estado: TraspasoEstado.PENDIENTE,
    },
  });
}

export type ResolverTraspasoDecision = "ACEPTAR" | "RECHAZAR";

/**
 * Quien tiene el número (el vendedor mismo, o el SEDE_ADMIN de la sede que
 * lo tiene) acepta o rechaza. Al aceptar, el boleto pasa a ser del
 * solicitante — a su pool de vendedor si es VENDEDOR, o al pool de su sede
 * si es SEDE_ADMIN (reutiliza el rol/sedeId de Usuario en vez de agregar un
 * campo nuevo a SolicitudTraspaso para esto).
 */
export async function resolverTraspaso(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    resueltoPorId: string;
    decision: ResolverTraspasoDecision;
    motivoRechazo?: string;
  },
): Promise<void> {
  const { solicitudId, resueltoPorId, decision, motivoRechazo } = params;

  const solicitud = await prisma.solicitudTraspaso.findUnique({ where: { id: solicitudId } });
  if (!solicitud || solicitud.estado !== TraspasoEstado.PENDIENTE) {
    throw new TraspasoError("La solicitud ya fue resuelta");
  }

  if (decision === "RECHAZAR") {
    const motivo = motivoRechazo?.trim();
    if (!motivo) {
      throw new TraspasoError("Tenés que indicar el motivo del rechazo");
    }
    await prisma.solicitudTraspaso.update({
      where: { id: solicitudId },
      data: {
        estado: TraspasoEstado.RECHAZADO,
        motivoRechazo: motivo,
        resueltoPorId,
        resueltoAt: new Date(),
      },
    });
    return;
  }

  const solicitante = await prisma.usuario.findUnique({ where: { id: solicitud.solicitanteId } });
  if (!solicitante) {
    throw new TraspasoError("El solicitante ya no existe");
  }

  const nuevoDueno =
    solicitante.rol === UsuarioRol.SEDE_ADMIN
      ? { asignadoASedeId: solicitante.sedeId, asignadoAVendedorId: null }
      : { asignadoASedeId: null, asignadoAVendedorId: solicitud.solicitanteId };

  if (solicitante.rol === UsuarioRol.SEDE_ADMIN && !solicitante.sedeId) {
    throw new TraspasoError("El solicitante es SEDE_ADMIN pero no tiene una sede asignada");
  }

  await prisma.$transaction([
    prisma.boleto.update({
      where: { id: solicitud.boletoId },
      data: { ...nuevoDueno, asignacionModo: AsignacionModo.TRASPASO },
    }),
    prisma.solicitudTraspaso.update({
      where: { id: solicitudId },
      data: { estado: TraspasoEstado.ACEPTADO, resueltoPorId, resueltoAt: new Date() },
    }),
  ]);
}
