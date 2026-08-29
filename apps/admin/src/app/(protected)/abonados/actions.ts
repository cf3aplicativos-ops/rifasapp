"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type CreateAbonadoState = { error?: string } | undefined;

export async function crearAbonado(
  _prevState: CreateAbonadoState,
  formData: FormData,
): Promise<CreateAbonadoState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const numeroRaw = String(formData.get("numero") ?? "").trim();

  if (!nombre) {
    return { error: "El nombre es obligatorio" };
  }
  if (!telefono) {
    return { error: "El teléfono es obligatorio" };
  }
  const numero = Number(numeroRaw);
  if (!Number.isInteger(numero) || numero < 0) {
    return { error: "El número preferido debe ser un entero mayor o igual a 0" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  try {
    await prisma.abonado.create({ data: { nombre, telefono, numero } });
  } catch {
    return { error: `Ya existe un abonado con el teléfono ${telefono}` };
  }

  revalidatePath("/abonados");
  return undefined;
}

export async function eliminarAbonado(abonadoId: string) {
  const session = await auth();
  assertRole(session, ["TENANT_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await prisma.abonado.delete({ where: { id: abonadoId } });

  revalidatePath("/abonados");
}
