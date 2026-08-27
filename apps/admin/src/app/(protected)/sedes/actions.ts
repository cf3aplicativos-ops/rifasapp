"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type CreateSedeState = { error?: string } | undefined;

export async function createSede(
  _prevState: CreateSedeState,
  formData: FormData,
): Promise<CreateSedeState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { error: "El nombre es obligatorio" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await prisma.sede.create({ data: { nombre } });

  revalidatePath("/sedes");
  return undefined;
}
