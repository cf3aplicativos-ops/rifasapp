import { confirmarPagoDeVenta, anularVentaPendiente } from "@rifaxapp/db-tenant";
import { notificarPagoConfirmado } from "@rifaxapp/notifications";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { verifyWompiEventChecksum } from "@/lib/wompi";

/**
 * Webhook de Wompi (Fase 8) — Wompi pega acá directo, sin cookies/sesión,
 * así que esta ruta queda excluida del proxy de sesión (ver
 * apps/clientes/src/proxy.ts). No hay forma de saber a qué tenant
 * pertenece una transacción por el Host (la URL es una sola, fija) — se
 * codifica `{tenantId}--{ventaId}` en el `reference` al armar el checkout
 * (ver iniciarPagoWompi en .../rifas/actions.ts) y acá se parsea de vuelta.
 *
 * Wompi reintenta hasta 3 veces si no respondemos 2xx — por eso se
 * responde 200 en todos los casos ya manejados como no-op (evento
 * duplicado, reference que no es nuestro, status PENDING), y solo se
 * devuelve un código de error cuando la firma no es válida.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: {
    event?: string;
    data?: { transaction?: { reference?: string; status?: string } };
    signature?: { properties?: string[]; checksum?: string };
    timestamp?: number;
  };

  try {
    payload = await request.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!verifyWompiEventChecksum(payload)) {
    return new Response("invalid signature", { status: 401 });
  }

  if (payload.event !== "transaction.updated") {
    return new Response("ok", { status: 200 });
  }

  const reference = payload.data?.transaction?.reference ?? "";
  const [tenantId, ventaId] = reference.split("--");
  if (!tenantId || !ventaId) {
    // No es un reference nuestro (o está malformado) — ack igual para que
    // Wompi no reintente para siempre.
    return new Response("ok", { status: 200 });
  }

  const prisma = await getTenantPrismaClient(tenantId);
  const status = payload.data?.transaction?.status;

  try {
    if (status === "APPROVED") {
      // Idempotente: si ya estaba PAGADA (evento duplicado, Wompi reintenta
      // igual con 2xx), confirmarPagoDeVenta tira acá — el catch de abajo lo
      // ignora, y justamente por eso el email SOLO sale si esta llamada fue
      // la que realmente confirmó el pago (no en cada reintento del evento).
      await confirmarPagoDeVenta(prisma, ventaId);
      await notificarPagoConfirmado(prisma, ventaId).catch(() => {});
    } else if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") {
      await anularVentaPendiente(prisma, ventaId).catch(() => {});
    }
    // PENDING (o cualquier otro status futuro): no-op, esperamos el próximo evento.
  } catch {
    // O bien confirmarPagoDeVenta/anularVentaPendiente tiraron porque la
    // venta ya no estaba PENDIENTE (evento duplicado, ya resuelto), o
    // getTenantPrismaClient falló (tenantId inválido, DB no disponible) —
    // ninguno es un problema reintentable por Wompi, ack de todas formas.
  }

  return new Response("ok", { status: 200 });
}
