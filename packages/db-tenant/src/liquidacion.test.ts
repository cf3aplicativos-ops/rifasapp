import { describe, expect, it, vi } from "vitest";
import { crearLiquidacion, LiquidacionError } from "./liquidacion";

function makePrismaMock() {
  const usuarioFindUnique = vi.fn();
  const ventaFindMany = vi.fn();
  const liquidacionCreate = vi.fn();
  const ventaUpdateMany = vi.fn();

  const prisma = {
    usuario: { findUnique: usuarioFindUnique },
    venta: { findMany: ventaFindMany, updateMany: ventaUpdateMany },
    liquidacion: { create: liquidacionCreate },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        liquidacion: { create: liquidacionCreate },
        venta: { updateMany: ventaUpdateMany },
      }),
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { prisma, usuarioFindUnique, ventaFindMany, liquidacionCreate, ventaUpdateMany };
}

const periodoDesde = new Date("2026-08-01T00:00:00Z");
const periodoHasta = new Date("2026-08-31T23:59:59Z");

describe("crearLiquidacion", () => {
  it("tira si el vendedor no existe", async () => {
    const { prisma, usuarioFindUnique } = makePrismaMock();
    usuarioFindUnique.mockResolvedValue(null);

    await expect(
      crearLiquidacion(prisma, { vendedorId: "v1", periodoDesde, periodoHasta, generadaPorId: "a1" }),
    ).rejects.toThrow(/no existe/);
  });

  it("tira si el vendedor no tiene comisionPct configurado", async () => {
    const { prisma, usuarioFindUnique } = makePrismaMock();
    usuarioFindUnique.mockResolvedValue({ id: "v1", comisionPct: null });

    await expect(
      crearLiquidacion(prisma, { vendedorId: "v1", periodoDesde, periodoHasta, generadaPorId: "a1" }),
    ).rejects.toThrow(/no tiene un % de comisión configurado/);
  });

  it("tira si no hay ventas pendientes de liquidar en el período", async () => {
    const { prisma, usuarioFindUnique, ventaFindMany } = makePrismaMock();
    usuarioFindUnique.mockResolvedValue({ id: "v1", comisionPct: 10 });
    ventaFindMany.mockResolvedValue([]);

    await expect(
      crearLiquidacion(prisma, { vendedorId: "v1", periodoDesde, periodoHasta, generadaPorId: "a1" }),
    ).rejects.toThrow(/no hay ventas pendientes/i);
  });

  it("crea la liquidación con el monto correcto y marca las ventas cubiertas", async () => {
    const { prisma, usuarioFindUnique, ventaFindMany, liquidacionCreate, ventaUpdateMany } =
      makePrismaMock();
    usuarioFindUnique.mockResolvedValue({ id: "v1", comisionPct: 10 });
    ventaFindMany.mockResolvedValue([
      { id: "venta1", montoTotal: 100 },
      { id: "venta2", montoTotal: 50 },
    ]);
    liquidacionCreate.mockResolvedValue({ id: "liq1" });

    const result = await crearLiquidacion(prisma, {
      vendedorId: "v1",
      periodoDesde,
      periodoHasta,
      generadaPorId: "a1",
    });

    expect(result).toEqual({ id: "liq1" });
    expect(ventaFindMany).toHaveBeenCalledWith({
      where: {
        vendedorId: "v1",
        estado: "PAGADA",
        liquidacionId: null,
        createdAt: { gte: periodoDesde, lte: periodoHasta },
      },
    });
    expect(liquidacionCreate).toHaveBeenCalledWith({
      data: {
        vendedorId: "v1",
        periodoDesde,
        periodoHasta,
        comisionPct: 10,
        montoVentas: 150,
        montoComision: 15,
        cantidadVentas: 2,
        generadaPorId: "a1",
      },
    });
    expect(ventaUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["venta1", "venta2"] } },
      data: { liquidacionId: "liq1" },
    });
  });

  it("redondea el monto de comisión a 2 decimales", async () => {
    const { prisma, usuarioFindUnique, ventaFindMany, liquidacionCreate } = makePrismaMock();
    usuarioFindUnique.mockResolvedValue({ id: "v1", comisionPct: 7.5 });
    ventaFindMany.mockResolvedValue([{ id: "venta1", montoTotal: 33.33 }]);
    liquidacionCreate.mockResolvedValue({ id: "liq1" });

    await crearLiquidacion(prisma, {
      vendedorId: "v1",
      periodoDesde,
      periodoHasta,
      generadaPorId: "a1",
    });

    const montoComision = liquidacionCreate.mock.calls[0]?.[0].data.montoComision;
    expect(montoComision).toBeCloseTo(2.5, 2);
  });

  it("dos llamadas seguidas sobre el mismo período no duplican monto (la segunda no encuentra nada)", async () => {
    const { prisma, usuarioFindUnique, ventaFindMany, liquidacionCreate } = makePrismaMock();
    usuarioFindUnique.mockResolvedValue({ id: "v1", comisionPct: 10 });
    ventaFindMany.mockResolvedValueOnce([{ id: "venta1", montoTotal: 100 }]);
    liquidacionCreate.mockResolvedValue({ id: "liq1" });

    await crearLiquidacion(prisma, {
      vendedorId: "v1",
      periodoDesde,
      periodoHasta,
      generadaPorId: "a1",
    });
    expect(liquidacionCreate).toHaveBeenCalledTimes(1);

    // Segunda llamada: en la DB real, la venta1 ya tiene liquidacionId
    // seteado, así que el `WHERE liquidacionId: null` de findMany no la
    // trae de vuelta — acá lo simulamos devolviendo [].
    ventaFindMany.mockResolvedValueOnce([]);
    await expect(
      crearLiquidacion(prisma, { vendedorId: "v1", periodoDesde, periodoHasta, generadaPorId: "a1" }),
    ).rejects.toThrow(LiquidacionError);
    expect(liquidacionCreate).toHaveBeenCalledTimes(1);
  });
});
