"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import {
  AsignacionError,
  asignarBoletosConsecutivo,
  asignarBoletosAleatorio,
  asignarBoletosAbonados,
  type AsignacionTarget,
} from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

export type AsignarBoletosState = { error?: string; success?: string } | undefined;

// El target llega del <select> como "sede:<id>" o "vendedor:<id>" — un solo
// campo evita tener que sincronizar dos <select> dependientes en el cliente.
function parseTarget(targetRaw: string): AsignacionTarget | null {
  const [tipo, id] = targetRaw.split(":");
  if (tipo === "sede" && id) return { sedeId: id };
  if (tipo === "vendedor" && id) return { vendedorId: id };
  return null;
}

export async function asignarBoletos(
  _prevState: AsignarBoletosState,
  formData: FormData,
): Promise<AsignarBoletosState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const targetRaw = String(formData.get("target") ?? "");
  const modo = String(formData.get("modo") ?? "");
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();

  const target = parseTarget(targetRaw);
  if (!target) {
    return { error: "Elegí a quién asignarle los boletos" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  try {
    if (modo === "ABONADOS") {
      const { resultados } = await asignarBoletosAbonados(prisma, { rifaId, target });
      const exitosos = resultados.filter((r) => r.ok);
      const fallidos = resultados.filter((r) => !r.ok);
      if (resultados.length === 0) {
        return { error: "Todavía no hay abonados registrados" };
      }
      const resumenFallidos = fallidos
        .map((f) => `${f.nombre} (#${f.numero}: ${f.motivo})`)
        .join("; ");
      return {
        success:
          `${exitosos.length} de ${resultados.length} abonados asignados` +
          (fallidos.length > 0 ? `. Sin asignar: ${resumenFallidos}` : ""),
      };
    }

    const cantidad = Number(cantidadRaw);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return { error: "La cantidad a asignar debe ser un entero mayor a 0" };
    }

    const { numeros } =
      modo === "ALEATORIO"
        ? await asignarBoletosAleatorio(prisma, { rifaId, target, cantidad })
        : await asignarBoletosConsecutivo(prisma, { rifaId, target, cantidad });

    return { success: `Asignados: ${numeros.join(", ")}` };
  } catch (error) {
    if (error instanceof AsignacionError) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo asignar" };
  } finally {
    revalidatePath(`/rifas/${rifaId}/asignaciones`);
  }
}
