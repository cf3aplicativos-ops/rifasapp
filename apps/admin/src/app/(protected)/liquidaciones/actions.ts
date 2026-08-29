"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { crearLiquidacion as crearLiquidacionCompartida, LiquidacionError } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type CrearLiquidacionState = { error?: string; success?: string } | undefined;

export async function crearLiquidacion(
  _prevState: CrearLiquidacionState,
  formData: FormData,
): Promise<CrearLiquidacionState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const vendedorId = String(formData.get("vendedorId") ?? "");
  const periodoDesdeRaw = String(formData.get("periodoDesde") ?? "");
  const periodoHastaRaw = String(formData.get("periodoHasta") ?? "");

  if (!vendedorId) {
    return { error: "Elegí un vendedor" };
  }

  const periodoDesde = new Date(periodoDesdeRaw);
  const periodoHasta = new Date(periodoHastaRaw);
  if (Number.isNaN(periodoDesde.getTime()) || Number.isNaN(periodoHasta.getTime())) {
    return { error: "Elegí un período válido" };
  }
  if (periodoDesde > periodoHasta) {
    return { error: "La fecha de inicio no puede ser posterior a la de fin" };
  }
  // El <input type="date"> manda solo la fecha (00:00) — extender hasta el
  // final de ese día para no dejar afuera ventas del último día elegido.
  periodoHasta.setHours(23, 59, 59, 999);

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  try {
    const liquidacion = await crearLiquidacionCompartida(prisma, {
      vendedorId,
      periodoDesde,
      periodoHasta,
      generadaPorId: session.user.id,
    });
    revalidatePath("/liquidaciones");
    return {
      success: `Liquidación generada: ${liquidacion.cantidadVentas} ventas por $${Number(liquidacion.montoVentas).toFixed(2)}, comisión $${Number(liquidacion.montoComision).toFixed(2)}`,
    };
  } catch (error) {
    if (error instanceof LiquidacionError) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo generar la liquidación" };
  }
}
