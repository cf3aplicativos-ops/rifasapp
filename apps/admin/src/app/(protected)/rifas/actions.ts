"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import {
  RifaEstado,
  BoletoEstado,
  RifaFormatoDigitos,
  CANTIDAD_MAXIMA_POR_FORMATO,
  numeroInicialBoleto,
  confirmarPagoDeVenta as confirmarPagoDeVentaShared,
  anularVentaPendiente as anularVentaPendienteShared,
} from "@rifaxapp/db-tenant";
import { notificarGanador, notificarPagoConfirmado } from "@rifaxapp/notifications";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

// Tope arbitrario, solo para rifas SIN formato de dígitos (legacy) — con
// formato, la cantidad de boletos es siempre el rango completo del formato
// elegido (100/1000/10000, ver CANTIDAD_MAXIMA_POR_FORMATO), que puede
// superar este número a propósito (ej. 4 dígitos = 10000 boletos).
const MAX_BOLETOS = 2000;

// Fase 19A: el formato de dígitos es opcional — una rifa sin formato se
// comporta exactamente como antes (numeración 1..cantidadBoletos, sin
// límite propio más allá de MAX_BOLETOS). Solo si el admin elige un
// formato se valida el rango que ese formato permite.
const FORMATOS_VALIDOS = Object.values(RifaFormatoDigitos);

export type CreateRifaState = { error?: string } | undefined;

export async function crearRifa(
  _prevState: CreateRifaState,
  formData: FormData,
): Promise<CreateRifaState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const precioBoletoRaw = String(formData.get("precioBoleto") ?? "").trim();
  const cantidadBoletosRaw = String(formData.get("cantidadBoletos") ?? "").trim();
  const formatoDigitosRaw = String(formData.get("formatoDigitos") ?? "").trim();

  if (!nombre) {
    return { error: "El nombre es obligatorio" };
  }

  const precioBoleto = Number(precioBoletoRaw);
  if (!Number.isFinite(precioBoleto) || precioBoleto <= 0) {
    return { error: "El precio del boleto debe ser un número mayor a 0" };
  }

  // "" = sin formato (compatibilidad con rifas legacy) — no es un error.
  let formatoDigitos: RifaFormatoDigitos | null = null;
  if (formatoDigitosRaw) {
    if (!FORMATOS_VALIDOS.includes(formatoDigitosRaw as RifaFormatoDigitos)) {
      return { error: "Formato de dígitos inválido" };
    }
    formatoDigitos = formatoDigitosRaw as RifaFormatoDigitos;
  }

  // Con formato, la cantidad de boletos SIEMPRE es el rango completo (00-99,
  // 000-999, 0000-9999) — se calcula acá, no se confía en lo que mandó el
  // cliente (el formulario ya lo manda de solo lectura, esto es defensa en
  // profundidad). MAX_BOLETOS solo aplica a rifas legacy sin formato, donde
  // la cantidad sigue siendo un número libre elegido a mano.
  let cantidadBoletos: number;
  if (formatoDigitos) {
    cantidadBoletos = CANTIDAD_MAXIMA_POR_FORMATO[formatoDigitos];
  } else {
    cantidadBoletos = Number(cantidadBoletosRaw);
    if (!Number.isInteger(cantidadBoletos) || cantidadBoletos <= 0) {
      return { error: "La cantidad de boletos debe ser un entero mayor a 0" };
    }
    if (cantidadBoletos > MAX_BOLETOS) {
      return { error: `La cantidad de boletos no puede superar ${MAX_BOLETOS}` };
    }
  }

  // Premios anticipados definidos en el mismo formulario de creación (antes
  // había que ir a /rifas/[rifaId]/premios después de crear la rifa; ahora
  // se pueden cargar de una, esa pantalla sigue existiendo para agregar más
  // o editarlos más adelante). Filas vacías (sin nombre) se ignoran.
  const premioNombres = formData.getAll("premioNombre").map((v) => String(v).trim());
  const premioNumerosRaw = formData.getAll("premioNumero").map((v) => String(v).trim());
  const inicio = numeroInicialBoleto(formatoDigitos);
  const fin = inicio + cantidadBoletos - 1;

  const premios: { nombre: string; numero: number }[] = [];
  const numerosVistos = new Set<number>();
  for (let i = 0; i < premioNombres.length; i++) {
    const premioNombre = premioNombres[i];
    if (!premioNombre) continue; // fila sin usar
    const numero = Number(premioNumerosRaw[i]);
    if (!Number.isInteger(numero) || numero < inicio || numero > fin) {
      return { error: `El número del premio "${premioNombre}" debe estar entre ${inicio} y ${fin}` };
    }
    if (numerosVistos.has(numero)) {
      return { error: `Hay dos premios anticipados con el mismo número (${numero})` };
    }
    numerosVistos.add(numero);
    premios.push({ nombre: premioNombre, numero });
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await prisma.$transaction(async (tx) => {
    const rifa = await tx.rifa.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        precioBoleto,
        cantidadBoletos,
        formatoDigitos,
        creadoPorId: session.user.id,
      },
    });
    if (premios.length > 0) {
      await tx.premioAnticipado.createMany({
        data: premios.map((p) => ({ rifaId: rifa.id, nombre: p.nombre, numero: p.numero })),
      });
    }
  });

  revalidatePath("/rifas");
  return undefined;
}

export async function activarRifa(rifaId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== RifaEstado.BORRADOR) {
    throw new Error("Solo se puede activar una rifa en estado BORRADOR");
  }

  const inicio = numeroInicialBoleto(rifa.formatoDigitos);
  await prisma.$transaction([
    prisma.boleto.createMany({
      data: Array.from({ length: rifa.cantidadBoletos }, (_, i) => ({
        rifaId: rifa.id,
        numero: inicio + i,
      })),
    }),
    prisma.rifa.update({ where: { id: rifa.id }, data: { estado: RifaEstado.ACTIVA } }),
  ]);

  revalidatePath("/rifas");
}

export async function cancelarRifa(rifaId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado === RifaEstado.CERRADA || rifa.estado === RifaEstado.CANCELADA) {
    throw new Error("Solo se puede cancelar una rifa en estado BORRADOR o ACTIVA");
  }

  await prisma.rifa.update({ where: { id: rifaId }, data: { estado: RifaEstado.CANCELADA } });
  revalidatePath("/rifas");
}

export type CerrarRifaState = { error?: string } | undefined;

export async function cerrarRifa(
  _prevState: CerrarRifaState,
  formData: FormData,
): Promise<CerrarRifaState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const numeroGanadorRaw = String(formData.get("numeroGanador") ?? "").trim();
  const numeroGanador = Number(numeroGanadorRaw);
  if (!Number.isInteger(numeroGanador)) {
    return { error: "El número ganador debe ser un entero" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== RifaEstado.ACTIVA) {
    return { error: "Solo se puede cerrar una rifa en estado ACTIVA" };
  }

  const boletoGanador = await prisma.boleto.findUnique({
    where: { rifaId_numero: { rifaId, numero: numeroGanador } },
  });
  if (!boletoGanador || boletoGanador.estado !== BoletoEstado.VENDIDO) {
    return { error: `El boleto #${numeroGanador} no existe o no fue vendido` };
  }

  await prisma.rifa.update({
    where: { id: rifaId },
    data: { estado: RifaEstado.CERRADA, fechaSorteo: new Date(), boletoGanadorId: boletoGanador.id },
  });

  // Fase 9: nunca bloquea el cierre de la rifa si el email falla.
  await notificarGanador(prisma, rifaId).catch(() => {});

  revalidatePath("/rifas");
  revalidatePath(`/rifas/${rifaId}`);
  return undefined;
}

// La transacción de confirmar/anular vive en @rifaxapp/db-tenant
// (confirmarPagoDeVenta/anularVentaPendiente) porque el webhook de Wompi
// (Fase 8) necesita disparar exactamente la misma lógica sin sesión ni
// RBAC — acá solo se resuelve el permiso y se revalida la ruta.
export async function confirmarPagoVenta(ventaId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta) {
    throw new Error("Solo se puede confirmar una venta en estado PENDIENTE");
  }

  await confirmarPagoDeVentaShared(prisma, ventaId);
  // Fase 9: nunca bloquea la confirmación del pago si el email falla.
  await notificarPagoConfirmado(prisma, ventaId).catch(() => {});
  revalidatePath(`/rifas/${venta.rifaId}/ventas`);
}

export async function anularVenta(ventaId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta) {
    throw new Error("Solo se puede anular una venta en estado PENDIENTE");
  }

  await anularVentaPendienteShared(prisma, ventaId);
  revalidatePath(`/rifas/${venta.rifaId}/ventas`);
}
