import { AsignacionModo, BoletoEstado, type PrismaClient } from "./generated/client";

/**
 * Fase 19B: a quién se le asigna un lote de boletos. Los dos casos son
 * mutuamente excluyentes — igual que los campos asignadoASedeId/
 * asignadoAVendedorId en Boleto, que reflejan directamente este target.
 */
export type AsignacionTarget = { sedeId: string } | { vendedorId: string };

export class AsignacionError extends Error {}

function targetData(target: AsignacionTarget) {
  return "sedeId" in target
    ? { asignadoASedeId: target.sedeId, asignadoAVendedorId: null }
    : { asignadoASedeId: null, asignadoAVendedorId: target.vendedorId };
}

/** Boletos DISPONIBLE de la rifa que todavía no tienen dueño (ni sede ni
 * vendedor) — el pool del que se puede asignar, en cualquiera de los 3
 * modos. */
async function boletosLibres(prisma: PrismaClient, rifaId: string) {
  return prisma.boleto.findMany({
    where: {
      rifaId,
      estado: BoletoEstado.DISPONIBLE,
      asignadoASedeId: null,
      asignadoAVendedorId: null,
    },
    orderBy: { numero: "asc" },
  });
}

/** Toma los `cantidad` números libres más bajos, en orden. */
export async function asignarBoletosConsecutivo(
  prisma: PrismaClient,
  params: { rifaId: string; target: AsignacionTarget; cantidad: number },
): Promise<{ numeros: number[] }> {
  const { rifaId, target, cantidad } = params;
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new AsignacionError("La cantidad a asignar debe ser un entero mayor a 0");
  }

  const libres = await boletosLibres(prisma, rifaId);
  if (libres.length < cantidad) {
    throw new AsignacionError(
      `Solo hay ${libres.length} boletos libres, no se pueden asignar ${cantidad}`,
    );
  }

  const elegidos = libres.slice(0, cantidad);
  await prisma.boleto.updateMany({
    where: { id: { in: elegidos.map((b) => b.id) } },
    data: { ...targetData(target), asignacionModo: AsignacionModo.CONSECUTIVO },
  });

  return { numeros: elegidos.map((b) => b.numero).sort((a, b) => a - b) };
}

/** Toma `cantidad` números libres al azar del pool disponible. */
export async function asignarBoletosAleatorio(
  prisma: PrismaClient,
  params: { rifaId: string; target: AsignacionTarget; cantidad: number },
): Promise<{ numeros: number[] }> {
  const { rifaId, target, cantidad } = params;
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new AsignacionError("La cantidad a asignar debe ser un entero mayor a 0");
  }

  const libres = await boletosLibres(prisma, rifaId);
  if (libres.length < cantidad) {
    throw new AsignacionError(
      `Solo hay ${libres.length} boletos libres, no se pueden asignar ${cantidad}`,
    );
  }

  const barajados = [...libres];
  for (let i = barajados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = barajados[i]!;
    barajados[i] = barajados[j]!;
    barajados[j] = tmp;
  }
  const elegidos = barajados.slice(0, cantidad);

  await prisma.boleto.updateMany({
    where: { id: { in: elegidos.map((b) => b.id) } },
    data: { ...targetData(target), asignacionModo: AsignacionModo.ALEATORIO },
  });

  return { numeros: elegidos.map((b) => b.numero).sort((a, b) => a - b) };
}

export type AsignacionAbonadoResultado =
  | { abonadoId: string; nombre: string; numero: number; ok: true }
  | { abonadoId: string; nombre: string; numero: number; ok: false; motivo: string };

/**
 * Modo "abonados": para cada Abonado registrado, intenta reservarle en ESTA
 * rifa el mismo número que tiene guardado como preferencia. No es atómico a
 * propósito — un abonado cuyo número ya está vendido/asignado a otro no
 * debe frenar al resto, se reporta como fallido y sigue con los demás.
 */
export async function asignarBoletosAbonados(
  prisma: PrismaClient,
  params: { rifaId: string; target: AsignacionTarget },
): Promise<{ resultados: AsignacionAbonadoResultado[] }> {
  const { rifaId, target } = params;
  const abonados = await prisma.abonado.findMany({ orderBy: { nombre: "asc" } });

  const resultados: AsignacionAbonadoResultado[] = [];
  for (const abonado of abonados) {
    const boleto = await prisma.boleto.findUnique({
      where: { rifaId_numero: { rifaId, numero: abonado.numero } },
    });

    if (!boleto) {
      resultados.push({
        abonadoId: abonado.id,
        nombre: abonado.nombre,
        numero: abonado.numero,
        ok: false,
        motivo: "Ese número no existe en esta rifa",
      });
      continue;
    }
    if (boleto.estado !== BoletoEstado.DISPONIBLE) {
      resultados.push({
        abonadoId: abonado.id,
        nombre: abonado.nombre,
        numero: abonado.numero,
        ok: false,
        motivo: "Ya fue vendido o reservado",
      });
      continue;
    }
    if (boleto.asignadoASedeId || boleto.asignadoAVendedorId) {
      resultados.push({
        abonadoId: abonado.id,
        nombre: abonado.nombre,
        numero: abonado.numero,
        ok: false,
        motivo: "Ya está asignado a otro dueño",
      });
      continue;
    }

    await prisma.boleto.update({
      where: { id: boleto.id },
      data: { ...targetData(target), asignacionModo: AsignacionModo.ABONADOS, abonadoId: abonado.id },
    });
    resultados.push({ abonadoId: abonado.id, nombre: abonado.nombre, numero: abonado.numero, ok: true });
  }

  return { resultados };
}
