import { beforeEach, describe, expect, it, vi } from "vitest";

const enviarEmail = vi.fn();
vi.mock("./resend-client", () => ({ enviarEmail: (...args: unknown[]) => enviarEmail(...args) }));

const rifaFindUnique = vi.fn();
const prisma = { rifa: { findUnique: rifaFindUnique } } as never;

const { notificarGanador } = await import("./ganador");

describe("notificarGanador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no envía nada si la rifa no tiene boletoGanador", async () => {
    rifaFindUnique.mockResolvedValue({ nombre: "Rifa moto", boletoGanador: null });
    await notificarGanador(prisma, "r1");
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("no envía nada si el boleto ganador lo compró alguien sin cuenta (venta presencial)", async () => {
    rifaFindUnique.mockResolvedValue({
      nombre: "Rifa moto",
      boletoGanador: { numero: 5, venta: { cliente: null, compradorNombre: "Juan" } },
    });
    await notificarGanador(prisma, "r1");
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("envía el email de felicitaciones al cliente ganador", async () => {
    rifaFindUnique.mockResolvedValue({
      nombre: "Rifa moto",
      boletoGanador: { numero: 5, venta: { cliente: { email: "ganador@example.com" } } },
    });

    await notificarGanador(prisma, "r1");

    expect(enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ganador@example.com",
        subject: "¡Ganaste la rifa Rifa moto! 🎉",
      }),
    );
    const html = enviarEmail.mock.calls[0]![0].html;
    expect(html).toContain("#5");
  });

  it("no tira si prisma tira (queda como no-op)", async () => {
    rifaFindUnique.mockRejectedValue(new Error("db down"));
    await expect(notificarGanador(prisma, "r1")).resolves.toBeUndefined();
    expect(enviarEmail).not.toHaveBeenCalled();
  });
});
