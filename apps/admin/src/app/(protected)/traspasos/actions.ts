"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { resolverTraspaso, TraspasoError } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export async function aceptarTraspaso(solicitudId: string) {
  const session = await auth();
  assertRole(session, ["SEDE_ADMIN"]);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await resolverTraspaso(prisma, {
    solicitudId,
    resueltoPorId: session.user.id,
    decision: "ACEPTAR",
  });

  revalidatePath("/traspasos");
}

export type RechazarTraspasoState = { error?: string } | undefined;

export async function rechazarTraspaso(
  _prevState: RechazarTraspasoState,
  formData: FormData,
): Promise<RechazarTraspasoState> {
  const session = await auth();
  try {
    assertRole(session, ["SEDE_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const solicitudId = String(formData.get("solicitudId") ?? "");
  const motivoRechazo = String(formData.get("motivoRechazo") ?? "").trim();

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  try {
    await resolverTraspaso(prisma, {
      solicitudId,
      resueltoPorId: session.user.id,
      decision: "RECHAZAR",
      motivoRechazo,
    });
  } catch (error) {
    if (error instanceof TraspasoError) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo rechazar" };
  }

  revalidatePath("/traspasos");
  return undefined;
}
