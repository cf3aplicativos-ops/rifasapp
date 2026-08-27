import { Resend } from "resend";

/**
 * Wrapper mínimo sobre Resend — Fase 9. Enviar un email es un "nice to
 * have" que NUNCA debe romper el flujo de negocio que lo dispara (confirmar
 * un pago, cerrar una rifa): si falta la API key o Resend devuelve un
 * error, se loguea y se sigue de largo, nunca se tira.
 *
 * Mientras el usuario no cargue su `RESEND_API_KEY` real, `enviarEmail`
 * es un no-op silencioso (con un warning en consola) — ver docs/ESTADO.md.
 */

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

export async function enviarEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn(`[notificaciones] RESEND_API_KEY no configurada — no se envía "${params.subject}"`);
    return;
  }

  const from = process.env.EMAIL_FROM || "Rifaxapp <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("[notificaciones] Resend devolvió un error al enviar el email:", error);
  }
}
