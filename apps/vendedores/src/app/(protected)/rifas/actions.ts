"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { BoletoEstado, MetodoPago, RifaEstado, VentaEstado } from "@rifaxapp/db-tenant";
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
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== RifaEstado.ACTIVA) {
    return { error: "La rifa no está activa" };
  }

  const boletos = await prisma.boleto.findMany({ where: { rifaId, numero: { in: numeros } } });
  if (boletos.length !== numeros.length) {
    return { error: "Alguno de los números elegidos no existe" };
  }
  const boletoIds = boletos.map((b) => b.id);
  const montoTotal = Number(rifa.precioBoleto) * numeros.length;

  try {
    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          rifaId,
          vendedorId: session.user.id,
          compradorNombre,
          compradorTelefono: compradorTelefono || null,
          montoTotal,
          metodoPago: metodoPago as MetodoPago,
          estado: VentaEstado.PAGADA,
        },
      });

      const { count } = await tx.boleto.updateMany({
        where: { id: { in: boletoIds }, estado: BoletoEstado.DISPONIBLE },
        data: { estado: BoletoEstado.VENDIDO, ventaId: venta.id },
      });

      if (count !== boletoIds.length) {
        throw new Error("Algunos números ya no están disponibles, refrescá la página");
      }
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo registrar la venta" };
  }

  revalidatePath(`/rifas/${rifaId}`);
  return undefined;
}
