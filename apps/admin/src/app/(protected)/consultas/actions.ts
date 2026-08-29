"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import {
  consultarEstadoNumero,
  solicitarTraspaso,
  TraspasoError,
  type ConsultaNumeroResultado,
} from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type ConsultarNumeroState =
  | { error: string }
  | { resultado: ConsultaNumeroResultado; rifaId: string; numero: number }
  | undefined;

export async function consultarNumero(
  _prevState: ConsultarNumeroState,
  formData: FormData,
): Promise<ConsultarNumeroState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN", "SEDE_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const numeroRaw = String(formData.get("numero") ?? "").trim();
  const numero = Number(numeroRaw);
  if (!rifaId) {
    return { error: "Elegí una rifa" };
  }
  if (!Number.isInteger(numero) || numero < 0) {
    return { error: "El número debe ser un entero mayor o igual a 0" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const resultado = await consultarEstadoNumero(prisma, {
    rifaId,
    numero,
    comoSedeId: session.user.rol === "SEDE_ADMIN" ? (session.user.sedeId ?? undefined) : undefined,
  });

  return { resultado, rifaId, numero };
}

export type SolicitarTraspasoState = { error?: string; success?: string } | undefined;

export async function solicitarTraspasoDesdeConsulta(
  _prevState: SolicitarTraspasoState,
  formData: FormData,
): Promise<SolicitarTraspasoState> {
  const session = await auth();
  try {
    assertRole(session, ["SEDE_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const numero = Number(formData.get("numero") ?? "");

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  try {
    await solicitarTraspaso(prisma, { rifaId, numero, solicitanteId: session.user.id });
  } catch (error) {
    if (error instanceof TraspasoError) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo solicitar el traspaso" };
  }

  revalidatePath("/traspasos");
  return { success: `Solicitud enviada para el número ${numero}` };
}
