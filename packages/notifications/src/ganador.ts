import type { PrismaClient } from "@rifaxapp/db-tenant";
import { enviarEmail } from "./resend-client";

/**
 * Notifica al CLIENTE ganador cuando se cierra una rifa (Fase 9) — se llama
 * DESPUÉS de que `cerrarRifa` (apps/admin) ya guardó el `boletoGanadorId`.
 * Nunca tira: si el boleto ganador lo compró un VENDEDOR a un comprador sin
 * cuenta (sin email), no hay a quién avisar por acá — hay que avisarle a
 * mano con el compradorNombre/Telefono que se ve en /rifas/[id]/ventas.
 */
export async function notificarGanador(prisma: PrismaClient, rifaId: string): Promise<void> {
  try {
    const rifa = await prisma.rifa.findUnique({
      where: { id: rifaId },
      include: { boletoGanador: { include: { venta: { include: { cliente: true } } } } },
    });

    const cliente = rifa?.boletoGanador?.venta?.cliente;
    if (!rifa?.boletoGanador || !cliente?.email) return;

    await enviarEmail({
      to: cliente.email,
      subject: `¡Ganaste la rifa ${rifa.nombre}! 🎉`,
      html: `
        <p>¡Felicitaciones!</p>
        <p>Tu boleto <strong>#${rifa.boletoGanador.numero}</strong> ganó la rifa <strong>${rifa.nombre}</strong>.</p>
        <p>Nos vamos a poner en contacto para coordinar la entrega del premio.</p>
      `,
    });
  } catch (error) {
    console.error("[notificaciones] no se pudo enviar el email de ganador", error);
  }
}
