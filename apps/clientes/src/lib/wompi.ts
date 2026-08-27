import { createHash } from "node:crypto";

const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

/**
 * Integración con Wompi (Fase 8) vía Web Checkout (redirect, no el Widget
 * embebido) — no hace falta cargar ningún script de Wompi del lado del
 * cliente, todo se arma server-side. Ver docs.wompi.co/en/docs/colombia/
 * widget-checkout-web/ y .../eventos/ para el algoritmo exacto.
 */

export function buildWompiCheckoutUrl(params: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
}): string {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!publicKey || !integritySecret) {
    throw new Error("Faltan las env vars WOMPI_PUBLIC_KEY / WOMPI_INTEGRITY_SECRET");
  }

  const { reference, amountInCents, redirectUrl } = params;
  const currency = "COP";

  // Orden exacto de la doc de Wompi: reference + amountInCents + currency +
  // integritySecret, sin separadores, SHA256 hex.
  const integrity = createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest("hex");

  const searchParams = new URLSearchParams({
    "public-key": publicKey,
    currency,
    "amount-in-cents": String(amountInCents),
    reference,
    "redirect-url": redirectUrl,
    "signature:integrity": integrity,
  });

  return `${WOMPI_CHECKOUT_URL}?${searchParams.toString()}`;
}

type WompiEventPayload = {
  event?: string;
  data?: Record<string, unknown>;
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
};

function getByPath(obj: unknown, path: string): string {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? "" : String(current);
}

/**
 * Verifica el checksum de un evento de webhook de Wompi (`transaction.updated`,
 * etc.): concatena los valores de `signature.properties` (resueltos contra
 * `data`, en el orden dado — nunca asumir un array fijo, Wompi lo puede
 * cambiar por evento), + `timestamp` + WOMPI_EVENTS_SECRET, SHA256, y
 * compara contra `signature.checksum` (case-insensitive).
 */
export function verifyWompiEventChecksum(payload: WompiEventPayload): boolean {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  const properties = payload.signature?.properties;
  const checksum = payload.signature?.checksum;
  const timestamp = payload.timestamp;

  if (!secret || !Array.isArray(properties) || !checksum || timestamp == null) {
    return false;
  }

  const concatenated = properties.map((prop) => getByPath(payload.data, prop)).join("");
  const toHash = `${concatenated}${timestamp}${secret}`;
  const computed = createHash("sha256").update(toHash).digest("hex");

  return computed.toLowerCase() === String(checksum).toLowerCase();
}
