"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import {
  RifaEstado,
  BoletoEstado,
  confirmarPagoDeVenta as confirmarPagoDeVentaShared,
  anularVentaPendiente as anularVentaPendienteShared,
} from "@rifaxapp/db-tenant";
import { notificarGanador, notificarPagoConfirmado } from "@rifaxapp/notifications";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

// Tope arbitrario para que la generación de boletos (bulk createMany) y la
// grilla de selección en vendedores/clientes se mantengan rápidas. Se puede
// subir más adelante si hace falta una rifa más grande.
const MAX_BOLETOS = 2000;

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

  if (!nombre) {
    return { error: "El nombre es obligatorio" };
  }

  const precioBoleto = Number(precioBoletoRaw);
  if (!Number.isFinite(precioBoleto) || precioBoleto <= 0) {
    return { error: "El precio del boleto debe ser un número mayor a 0" };
  }

  const cantidadBoletos = Number(cantidadBoletosRaw);
  if (!Number.isInteger(cantidadBoletos) || cantidadBoletos <= 0) {
    return { error: "La cantidad de boletos debe ser un entero mayor a 0" };
  }
  if (cantidadBoletos > MAX_BOLETOS) {
    return { error: `La cantidad de boletos no puede superar ${MAX_BOLETOS}` };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await prisma.rifa.create({
    data: {
      nombre,
      descripcion: descripcion || null,
      precioBoleto,
      cantidadBoletos,
      creadoPorId: session.user.id,
    },
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

  await prisma.$transaction([
    prisma.boleto.createMany({
      data: Array.from({ length: rifa.cantidadBoletos }, (_, i) => ({
        rifaId: rifa.id,
        numero: i + 1,
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
