"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { MetodoPago, reservarBoletosParaVenta, VentaLifecycleError } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";
import { buildWompiCheckoutUrl } from "@/lib/wompi";

// "Pagar por tu cuenta" (este form) solo acepta métodos manuales — WOMPI se
// fuerza desde iniciarPagoWompi, nunca lo elige el usuario acá (evita que
// una Venta quede marcada WOMPI sin haber pasado realmente por la pasarela).
const METODOS_MANUALES: MetodoPago[] = [MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA, MetodoPago.OTRO];

function parseNumeros(formData: FormData): number[] {
  return formData.getAll("numeros").map((n) => Number(n));
}

export type ReservarBoletosState = { error?: string } | undefined;

export async function reservarBoletos(
  _prevState: ReservarBoletosState,
  formData: FormData,
): Promise<ReservarBoletosState> {
  const session = await auth();
  try {
    assertRole(session, ["CLIENTE"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const metodoPago = String(formData.get("metodoPago") ?? "");
  const numeros = parseNumeros(formData);

  if (!METODOS_MANUALES.includes(metodoPago as MetodoPago)) {
    return { error: "Método de pago inválido" };
  }
  if (numeros.length === 0 || numeros.some((n) => !Number.isInteger(n))) {
    return { error: "Elegí al menos un boleto" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  try {
    await reservarBoletosParaVenta(prisma, {
      rifaId,
      clienteId: session.user.id,
      numeros,
      metodoPago: metodoPago as MetodoPago,
    });
  } catch (error) {
    return { error: error instanceof VentaLifecycleError ? error.message : "No se pudo reservar la venta" };
  }

  revalidatePath(`/rifas/${rifaId}`);
  revalidatePath("/mis-boletos");
  return undefined;
}

export type IniciarPagoWompiState = { error?: string } | undefined;

export async function iniciarPagoWompi(
  _prevState: IniciarPagoWompiState,
  formData: FormData,
): Promise<IniciarPagoWompiState> {
  const session = await auth();
  try {
    assertRole(session, ["CLIENTE"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const rifaId = String(formData.get("rifaId") ?? "");
  const numeros = parseNumeros(formData);
  if (numeros.length === 0 || numeros.some((n) => !Number.isInteger(n))) {
    return { error: "Elegí al menos un boleto" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  let ventaId: string;
  let montoTotal: number;
  try {
    const resultado = await reservarBoletosParaVenta(prisma, {
      rifaId,
      clienteId: session.user.id,
      numeros,
      metodoPago: MetodoPago.WOMPI,
    });
    ventaId = resultado.ventaId;
    montoTotal = resultado.montoTotal;
  } catch (error) {
    return { error: error instanceof VentaLifecycleError ? error.message : "No se pudo iniciar el pago" };
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocolo = host.includes("localhost") ? "http" : "https";

  // El redirect() de next/navigation va AFUERA del try/catch de arriba a
  // propósito: internamente tira un NEXT_REDIRECT que un catch genérico se
  // tragaría, mismo cuidado que con AuthError en apps/*/login/actions.ts.
  const checkoutUrl = buildWompiCheckoutUrl({
    reference: `${session.user.tenantId}--${ventaId}`,
    amountInCents: Math.round(montoTotal * 100),
    redirectUrl: `${protocolo}://${host}/mis-boletos?wompi=1`,
  });

  redirect(checkoutUrl);
}
