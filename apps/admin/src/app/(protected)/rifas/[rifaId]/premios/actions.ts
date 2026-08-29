"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { numeroInicialBoleto } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type CreatePremioState = { error?: string } | undefined;

export async function crearPremio(
  _prevState: CreatePremioState,
  formData: FormData,
): Promise<CreatePremioState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const numeroRaw = String(formData.get("numero") ?? "").trim();

  if (!nombre) {
    return { error: "El nombre del premio es obligatorio" };
  }

  const numero = Number(numeroRaw);
  if (!Number.isInteger(numero)) {
    return { error: "El número de boleto debe ser un entero" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa) {
    return { error: "La rifa no existe" };
  }

  const inicio = numeroInicialBoleto(rifa.formatoDigitos);
  const fin = inicio + rifa.cantidadBoletos - 1;
  if (numero < inicio || numero > fin) {
    return { error: `El número debe estar entre ${inicio} y ${fin}` };
  }

  try {
    await prisma.premioAnticipado.create({
      data: { rifaId, nombre, descripcion: descripcion || null, numero },
    });
  } catch {
    return { error: `Ya existe un premio anticipado para el número ${numero}` };
  }

  revalidatePath(`/rifas/${rifaId}/premios`);
  return undefined;
}

export async function marcarPremioEntregado(premioId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const premio = await prisma.premioAnticipado.findUnique({ where: { id: premioId } });
  if (!premio) {
    throw new Error("El premio no existe");
  }

  await prisma.premioAnticipado.update({
    where: { id: premioId },
    data: { entregado: true, entregadoAt: new Date() },
  });

  revalidatePath(`/rifas/${premio.rifaId}/premios`);
}

export async function eliminarPremio(premioId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const premio = await prisma.premioAnticipado.findUnique({ where: { id: premioId } });
  if (!premio) {
    throw new Error("El premio no existe");
  }

  await prisma.premioAnticipado.delete({ where: { id: premioId } });
  revalidatePath(`/rifas/${premio.rifaId}/premios`);
}
