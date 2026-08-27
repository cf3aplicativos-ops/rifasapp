import { describe, expect, it, vi } from "vitest";
import { expirarVentasVencidas } from "./expirar-ventas-vencidas";

function makePrismaMock() {
  const ventaFindMany = vi.fn();
  const ventaUpdateMany = vi.fn();
  const boletoUpdateMany = vi.fn();
  const prisma = {
    venta: { findMany: ventaFindMany, updateMany: ventaUpdateMany },
    boleto: { updateMany: boletoUpdateMany },
    $transaction: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { prisma, ventaFindMany, ventaUpdateMany, boletoUpdateMany };
}

describe("expirarVentasVencidas", () => {
  it("no hace nada si no hay ventas PENDIENTE vencidas", async () => {
    const { prisma, ventaFindMany, ventaUpdateMany, boletoUpdateMany } = makePrismaMock();
    ventaFindMany.mockResolvedValue([]);

    const count = await expirarVentasVencidas(prisma, 48);

    expect(count).toBe(0);
    expect(ventaUpdateMany).not.toHaveBeenCalled();
    expect(boletoUpdateMany).not.toHaveBeenCalled();
  });

  it("busca PENDIENTE con createdAt anterior al límite del TTL", async () => {
    const { prisma, ventaFindMany } = makePrismaMock();
    ventaFindMany.mockResolvedValue([]);

    const before = Date.now();
    await expirarVentasVencidas(prisma, 48);
    const after = Date.now();

    expect(ventaFindMany).toHaveBeenCalledTimes(1);
    const where = ventaFindMany.mock.calls[0]![0].where;
    expect(where.estado).toBe("PENDIENTE");
    const limite = where.createdAt.lt.getTime();
    // limite debe ser ~48hs antes de "ahora" (con margen para el tiempo del test).
    expect(limite).toBeGreaterThanOrEqual(before - 48 * 60 * 60 * 1000 - 1000);
    expect(limite).toBeLessThanOrEqual(after - 48 * 60 * 60 * 1000 + 1000);
  });

  it("marca las ventas vencidas VENCIDA y libera sus boletos RESERVADO", async () => {
    const { prisma, ventaFindMany, ventaUpdateMany, boletoUpdateMany } = makePrismaMock();
    ventaFindMany.mockResolvedValue([{ id: "v1" }, { id: "v2" }]);

    const count = await expirarVentasVencidas(prisma, 48);

    expect(count).toBe(2);
    expect(ventaUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["v1", "v2"] } },
      data: { estado: "VENCIDA" },
    });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { ventaId: { in: ["v1", "v2"] }, estado: "RESERVADO" },
      data: { estado: "DISPONIBLE", ventaId: null },
    });
  });

  it("usa DEFAULT_RESERVA_TTL_HORAS (48hs) si no se pasa ttlHoras", async () => {
    const { prisma, ventaFindMany } = makePrismaMock();
    ventaFindMany.mockResolvedValue([]);

    const before = Date.now();
    await expirarVentasVencidas(prisma);

    const where = ventaFindMany.mock.calls[0]![0].where;
    const limite = where.createdAt.lt.getTime();
    expect(before - limite).toBeCloseTo(48 * 60 * 60 * 1000, -3);
  });
});
