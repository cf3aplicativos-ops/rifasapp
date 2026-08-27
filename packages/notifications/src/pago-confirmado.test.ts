import { beforeEach, describe, expect, it, vi } from "vitest";

const enviarEmail = vi.fn();
vi.mock("./resend-client", () => ({ enviarEmail: (...args: unknown[]) => enviarEmail(...args) }));

const ventaFindUnique = vi.fn();
const prisma = { venta: { findUnique: ventaFindUnique } } as never;

const { notificarPagoConfirmado } = await import("./pago-confirmado");

describe("notificarPagoConfirmado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no envía nada si la venta no existe", async () => {
    ventaFindUnique.mockResolvedValue(null);
    await notificarPagoConfirmado(prisma, "v1");
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("no envía nada si la venta no tiene cliente (venta presencial de VENDEDOR)", async () => {
    ventaFindUnique.mockResolvedValue({
      cliente: null,
      compradorNombre: "Juan Pérez",
      rifa: { nombre: "Rifa moto" },
      boletos: [{ numero: 1 }],
      montoTotal: 10,
    });
    await notificarPagoConfirmado(prisma, "v1");
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("no envía nada si el cliente no tiene email cargado", async () => {
    ventaFindUnique.mockResolvedValue({
      cliente: { email: null },
      rifa: { nombre: "Rifa moto" },
      boletos: [{ numero: 1 }],
      montoTotal: 10,
    });
    await notificarPagoConfirmado(prisma, "v1");
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("envía el email con los boletos ordenados y el monto", async () => {
    ventaFindUnique.mockResolvedValue({
      cliente: { email: "cliente@example.com" },
      rifa: { nombre: "Rifa moto" },
      boletos: [{ numero: 3 }, { numero: 1 }, { numero: 2 }],
      montoTotal: 30,
    });

    await notificarPagoConfirmado(prisma, "v1");

    expect(enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.com",
        subject: "Pago confirmado — Rifa moto",
      }),
    );
    const html = enviarEmail.mock.calls[0]![0].html;
    expect(html).toContain("#1, #2, #3");
    expect(html).toContain("$30");
  });

  it("no tira si prisma tira (queda como no-op)", async () => {
    ventaFindUnique.mockRejectedValue(new Error("db down"));
    await expect(notificarPagoConfirmado(prisma, "v1")).resolves.toBeUndefined();
    expect(enviarEmail).not.toHaveBeenCalled();
  });
});
