"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import {
  MetodoPago,
  VentaLifecycleError,
  venderBoletosComoVendedor,
} from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

const METODOS_VALIDOS = Object.values(MetodoPago);

export type RegistrarVentaState = { error?: string } | undefined;

export async function registrarVenta(
  _prevState: RegistrarVentaState,
  formData: FormData,
): Promise<RegistrarVentaState> {
  const session = await auth();
  try {
    assertRole(session, ["VENDEDOR"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const compradorNombre = String(formData.get("compradorNombre") ?? "").trim();
  const compradorTelefono = String(formData.get("compradorTelefono") ?? "").trim();
  const metodoPago = String(formData.get("metodoPago") ?? "");
  const numeros = formData.getAll("numeros").map((n) => Number(n));

  if (!compradorNombre) {
    return { error: "El nombre del comprador es obligatorio" };
  }
  if (!METODOS_VALIDOS.includes(metodoPago as MetodoPago)) {
    return { error: "Método de pago inválido" };
  }
  if (numeros.length === 0 || numeros.some((n) => !Number.isInteger(n))) {
    return { error: "Elegí al menos un boleto" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  try {
    await venderBoletosComoVendedor(prisma, {
      rifaId,
      vendedorId: session.user.id,
      numeros,
      compradorNombre,
      compradorTelefono: compradorTelefono || null,
      metodoPago: metodoPago as MetodoPago,
    });
  } catch (error) {
    if (error instanceof VentaLifecycleError) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo registrar la venta" };
  }

  revalidatePath(`/rifas/${rifaId}`);
  return undefined;
}
