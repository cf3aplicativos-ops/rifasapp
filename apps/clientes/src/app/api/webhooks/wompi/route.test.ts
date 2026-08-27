import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmarPagoDeVenta = vi.fn();
const anularVentaPendiente = vi.fn();
vi.mock("@rifaxapp/db-tenant", () => ({
  confirmarPagoDeVenta: (...args: unknown[]) => confirmarPagoDeVenta(...args),
  anularVentaPendiente: (...args: unknown[]) => anularVentaPendiente(...args),
}));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __fake: "prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

const notificarPagoConfirmado = vi.fn().mockResolvedValue(undefined);
vi.mock("@rifaxapp/notifications", () => ({
  notificarPagoConfirmado: (...args: unknown[]) => notificarPagoConfirmado(...args),
}));

// La lógica de la firma en sí (SHA256, orden de concatenación, etc.) ya
// tiene su propio test exhaustivo en src/lib/wompi.test.ts — acá solo
// importa si el checksum pasó o no, para probar el DESPACHO de la ruta
// (parseo de reference, status → helper correcto, idempotencia).
const verifyWompiEventChecksum = vi.fn();
vi.mock("@/lib/wompi", () => ({
  verifyWompiEventChecksum: (payload: unknown) => verifyWompiEventChecksum(payload),
}));

const { POST } = await import("./route.js");

function requestWith(body: unknown) {
  return new Request("http://localhost/api/webhooks/wompi", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function payloadFor(status: string, reference: string, event = "transaction.updated") {
  return {
    event,
    data: { transaction: { id: "txn-1", status, reference } },
    signature: { properties: ["transaction.id", "transaction.status"], checksum: "fake-checksum" },
    timestamp: 1530291411,
  };
}

describe("POST /api/webhooks/wompi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyWompiEventChecksum.mockReturnValue(true);
    confirmarPagoDeVenta.mockResolvedValue(undefined);
    anularVentaPendiente.mockResolvedValue(undefined);
  });

  it("rechaza con 401 si la firma no es válida, sin tocar la DB", async () => {
    verifyWompiEventChecksum.mockReturnValue(false);

    const res = await POST(requestWith(payloadFor("APPROVED", "t1--v1")));

    expect(res.status).toBe(401);
    expect(getTenantPrismaClient).not.toHaveBeenCalled();
  });

  it("responde 200 sin hacer nada si el evento no es transaction.updated", async () => {
    const res = await POST(requestWith(payloadFor("APPROVED", "t1--v1", "other.event")));

    expect(res.status).toBe(200);
    expect(confirmarPagoDeVenta).not.toHaveBeenCalled();
  });

  it("responde 200 sin tocar la DB si el reference no tiene el formato tenantId--ventaId", async () => {
    const res = await POST(requestWith(payloadFor("APPROVED", "sin-separador")));

    expect(res.status).toBe(200);
    expect(getTenantPrismaClient).not.toHaveBeenCalled();
  });

  it("APPROVED confirma el pago de la venta correspondiente y notifica al cliente", async () => {
    const res = await POST(requestWith(payloadFor("APPROVED", "t1--v1")));

    expect(res.status).toBe(200);
    expect(getTenantPrismaClient).toHaveBeenCalledWith("t1");
    expect(confirmarPagoDeVenta).toHaveBeenCalledWith(expect.anything(), "v1");
    expect(notificarPagoConfirmado).toHaveBeenCalledWith(expect.anything(), "v1");
    expect(anularVentaPendiente).not.toHaveBeenCalled();
  });

  it.each(["DECLINED", "VOIDED", "ERROR"])("%s anula la venta pendiente", async (status) => {
    const res = await POST(requestWith(payloadFor(status, "t1--v1")));

    expect(res.status).toBe(200);
    expect(anularVentaPendiente).toHaveBeenCalledWith(expect.anything(), "v1");
    expect(confirmarPagoDeVenta).not.toHaveBeenCalled();
  });

  it("PENDING no hace nada", async () => {
    const res = await POST(requestWith(payloadFor("PENDING", "t1--v1")));

    expect(res.status).toBe(200);
    expect(confirmarPagoDeVenta).not.toHaveBeenCalled();
    expect(anularVentaPendiente).not.toHaveBeenCalled();
  });

  it("es idempotente: un APPROVED duplicado (venta ya PAGADA) sigue respondiendo 200 sin reenviar el email", async () => {
    confirmarPagoDeVenta.mockRejectedValue(new Error("Solo se puede confirmar una venta en estado PENDIENTE"));

    const res = await POST(requestWith(payloadFor("APPROVED", "t1--v1")));

    expect(res.status).toBe(200);
    expect(notificarPagoConfirmado).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const req = new Request("http://localhost/api/webhooks/wompi", { method: "POST", body: "no-json" });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
