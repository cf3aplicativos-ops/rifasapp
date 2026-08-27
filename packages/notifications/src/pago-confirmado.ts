import type { PrismaClient } from "@rifaxapp/db-tenant";
import { enviarEmail } from "./resend-client";

/**
 * Notifica al CLIENTE que su pago quedó confirmado (Fase 9) — se llama
 * DESPUÉS de que `confirmarPagoDeVenta` (packages/db-tenant) ya corrió,
 * desde los dos lugares donde una Venta pasa a PAGADA: la acción manual de
 * apps/admin y el webhook de Wompi en apps/clientes. Nunca tira: si la
 * venta no tiene un CLIENTE con cuenta (ej. venta presencial de un
 * VENDEDOR a un comprador sin cuenta) simplemente no hay a quién avisar.
 */
export async function notificarPagoConfirmado(prisma: PrismaClient, ventaId: string): Promise<void> {
  try {
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: { cliente: true, rifa: true, boletos: true },
    });

    if (!venta?.cliente?.email) return;

    const numeros = venta.boletos
      .map((b) => b.numero)
      .sort((a, b) => a - b)
      .map((n) => `#${n}`)
      .join(", ");

    await enviarEmail({
      to: venta.cliente.email,
      subject: `Pago confirmado — ${venta.rifa.nombre}`,
      html: `
        <p>¡Hola!</p>
        <p>Confirmamos tu pago para <strong>${venta.rifa.nombre}</strong>.</p>
        <p>Boletos: <strong>${numeros}</strong></p>
        <p>Monto: $${venta.montoTotal.toString()}</p>
        <p>¡Mucha suerte!</p>
      `,
    });
  } catch (error) {
    console.error("[notificaciones] no se pudo enviar el email de pago confirmado", error);
  }
}
