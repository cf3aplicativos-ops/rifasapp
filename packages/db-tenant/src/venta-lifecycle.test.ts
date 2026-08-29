import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reservarBoletosParaVenta,
  venderBoletosComoVendedor,
  confirmarPagoDeVenta,
  anularVentaPendiente,
  assertBoletosVendibles,
  VentaLifecycleError,
} from "./venta-lifecycle";

function makePrismaMock() {
  const rifaFindUnique = vi.fn();
  const boletoFindMany = vi.fn();
  const boletoUpdateMany = vi.fn();
  const ventaCreate = vi.fn();
  const ventaFindUnique = vi.fn();
  const ventaUpdate = vi.fn();

  const prisma = {
    rifa: { findUnique: rifaFindUnique },
    boleto: { findMany: boletoFindMany, updateMany: boletoUpdateMany },
    venta: { create: ventaCreate, findUnique: ventaFindUnique, update: ventaUpdate },
    $transaction: vi.fn((arg: unknown) => {
      if (typeof arg === "function") {
        return arg({
          venta: { create: ventaCreate },
          boleto: { updateMany: boletoUpdateMany },
        });
      }
      return Promise.resolve(undefined);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { prisma, rifaFindUnique, boletoFindMany, boletoUpdateMany, ventaCreate, ventaFindUnique, ventaUpdate };
}

describe("reservarBoletosParaVenta", () => {
  it("tira si la rifa no está ACTIVA", async () => {
    const { prisma, rifaFindUnique } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "BORRADOR", precioBoleto: 10 });

    await expect(
      reservarBoletosParaVenta(prisma, { rifaId: "r1", clienteId: "c1", numeros: [1], metodoPago: "WOMPI" }),
    ).rejects.toThrow(/no está activa/);
  });

  it("tira si algún número no existe", async () => {
    const { prisma, rifaFindUnique, boletoFindMany } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1 }]);

    await expect(
      reservarBoletosParaVenta(prisma, { rifaId: "r1", clienteId: "c1", numeros: [1, 2], metodoPago: "WOMPI" }),
    ).rejects.toThrow(/no existe/);
  });

  it("tira si algún boleto ya no está DISPONIBLE (condición de carrera)", async () => {
    const { prisma, rifaFindUnique, boletoFindMany, boletoUpdateMany, ventaCreate } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1 }]);
    boletoUpdateMany.mockResolvedValue({ count: 0 });
    ventaCreate.mockResolvedValue({ id: "v1" });

    await expect(
      reservarBoletosParaVenta(prisma, { rifaId: "r1", clienteId: "c1", numeros: [1], metodoPago: "WOMPI" }),
    ).rejects.toThrow(/ya no están disponibles/);
  });

  it("crea la Venta PENDIENTE con el metodoPago pedido y reserva los boletos", async () => {
    const { prisma, rifaFindUnique, boletoFindMany, boletoUpdateMany, ventaCreate } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([
      { id: "b1", numero: 1 },
      { id: "b2", numero: 2 },
    ]);
    boletoUpdateMany.mockResolvedValue({ count: 2 });
    ventaCreate.mockResolvedValue({ id: "v1" });

    const result = await reservarBoletosParaVenta(prisma, {
      rifaId: "r1",
      clienteId: "c1",
      numeros: [1, 2],
      metodoPago: "WOMPI",
    });

    expect(result).toEqual({ ventaId: "v1", montoTotal: 20 });
    expect(ventaCreate).toHaveBeenCalledWith({
      data: { rifaId: "r1", clienteId: "c1", montoTotal: 20, metodoPago: "WOMPI", estado: "PENDIENTE" },
    });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b1", "b2"] }, estado: "DISPONIBLE" },
      data: { estado: "RESERVADO", ventaId: "v1" },
    });
  });

  it("un CLIENTE no puede reservar un boleto asignado a un vendedor", async () => {
    const { prisma, rifaFindUnique, boletoFindMany } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1, asignadoAVendedorId: "vend1" }]);

    await expect(
      reservarBoletosParaVenta(prisma, { rifaId: "r1", clienteId: "c1", numeros: [1], metodoPago: "WOMPI" }),
    ).rejects.toThrow(/reservado, no disponible/);
  });

  it("un CLIENTE no puede reservar un boleto asignado a una sede", async () => {
    const { prisma, rifaFindUnique, boletoFindMany } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1, asignadoASedeId: "sede1" }]);

    await expect(
      reservarBoletosParaVenta(prisma, { rifaId: "r1", clienteId: "c1", numeros: [1], metodoPago: "WOMPI" }),
    ).rejects.toThrow(/reservado, no disponible/);
  });
});

describe("assertBoletosVendibles", () => {
  it("permite un boleto libre a cualquiera", () => {
    expect(() =>
      assertBoletosVendibles([{ numero: 1, asignadoASedeId: null, asignadoAVendedorId: null }]),
    ).not.toThrow();
    expect(() =>
      assertBoletosVendibles(
        [{ numero: 1, asignadoASedeId: null, asignadoAVendedorId: null }],
        "vend1",
      ),
    ).not.toThrow();
  });

  it("un vendedor puede vender lo suyo", () => {
    expect(() =>
      assertBoletosVendibles(
        [{ numero: 1, asignadoASedeId: null, asignadoAVendedorId: "vend1" }],
        "vend1",
      ),
    ).not.toThrow();
  });

  it("un vendedor no puede vender lo de otro vendedor", () => {
    expect(() =>
      assertBoletosVendibles(
        [{ numero: 1, asignadoASedeId: null, asignadoAVendedorId: "vend2" }],
        "vend1",
      ),
    ).toThrow(/asignado a otro vendedor/);
  });

  it("un vendedor no puede vender lo asignado a la sede", () => {
    expect(() =>
      assertBoletosVendibles(
        [{ numero: 1, asignadoASedeId: "sede1", asignadoAVendedorId: null }],
        "vend1",
      ),
    ).toThrow(/asignado a la sede/);
  });

  it("sin vendedorId (canal cliente/Wompi), cualquier boleto asignado queda bloqueado", () => {
    expect(() =>
      assertBoletosVendibles([{ numero: 1, asignadoASedeId: "sede1", asignadoAVendedorId: null }]),
    ).toThrow(/reservado, no disponible/);
    expect(() =>
      assertBoletosVendibles([{ numero: 1, asignadoASedeId: null, asignadoAVendedorId: "vend1" }]),
    ).toThrow(/reservado, no disponible/);
  });
});

describe("venderBoletosComoVendedor", () => {
  it("tira si la rifa no está ACTIVA", async () => {
    const { prisma, rifaFindUnique } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "BORRADOR", precioBoleto: 10 });

    await expect(
      venderBoletosComoVendedor(prisma, {
        rifaId: "r1",
        vendedorId: "vend1",
        numeros: [1],
        compradorNombre: "Juan",
        compradorTelefono: null,
        metodoPago: "EFECTIVO",
      }),
    ).rejects.toThrow(VentaLifecycleError);
  });

  it("tira si el boleto está asignado a otro vendedor", async () => {
    const { prisma, rifaFindUnique, boletoFindMany } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1, asignadoAVendedorId: "vend2" }]);

    await expect(
      venderBoletosComoVendedor(prisma, {
        rifaId: "r1",
        vendedorId: "vend1",
        numeros: [1],
        compradorNombre: "Juan",
        compradorTelefono: null,
        metodoPago: "EFECTIVO",
      }),
    ).rejects.toThrow(/asignado a otro vendedor/);
  });

  it("vende un boleto libre y uno asignado a sí mismo, en PAGADA", async () => {
    const { prisma, rifaFindUnique, boletoFindMany, boletoUpdateMany, ventaCreate } = makePrismaMock();
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([
      { id: "b1", numero: 1, asignadoAVendedorId: "vend1", asignadoASedeId: null },
      { id: "b2", numero: 2, asignadoAVendedorId: null, asignadoASedeId: null },
    ]);
    boletoUpdateMany.mockResolvedValue({ count: 2 });
    ventaCreate.mockResolvedValue({ id: "v1" });

    const result = await venderBoletosComoVendedor(prisma, {
      rifaId: "r1",
      vendedorId: "vend1",
      numeros: [1, 2],
      compradorNombre: "Juan",
      compradorTelefono: null,
      metodoPago: "EFECTIVO",
    });

    expect(result).toEqual({ ventaId: "v1", montoTotal: 20 });
    expect(ventaCreate).toHaveBeenCalledWith({
      data: {
        rifaId: "r1",
        vendedorId: "vend1",
        compradorNombre: "Juan",
        compradorTelefono: null,
        montoTotal: 20,
        metodoPago: "EFECTIVO",
        estado: "PAGADA",
      },
    });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b1", "b2"] }, estado: "DISPONIBLE" },
      data: { estado: "VENDIDO", ventaId: "v1" },
    });
  });
});

describe("confirmarPagoDeVenta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tira si la venta no está PENDIENTE", async () => {
    const { prisma, ventaFindUnique } = makePrismaMock();
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PAGADA" });

    await expect(confirmarPagoDeVenta(prisma, "v1")).rejects.toThrow(/PENDIENTE/);
  });

  it("marca la venta PAGADA y los boletos VENDIDO", async () => {
    const { prisma, ventaFindUnique, ventaUpdate, boletoUpdateMany } = makePrismaMock();
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PENDIENTE" });

    await confirmarPagoDeVenta(prisma, "v1");

    expect(ventaUpdate).toHaveBeenCalledWith({ where: { id: "v1" }, data: { estado: "PAGADA" } });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { ventaId: "v1", estado: "RESERVADO" },
      data: { estado: "VENDIDO" },
    });
  });
});

describe("anularVentaPendiente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tira si la venta no está PENDIENTE", async () => {
    const { prisma, ventaFindUnique } = makePrismaMock();
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "ANULADA" });

    await expect(anularVentaPendiente(prisma, "v1")).rejects.toThrow(/PENDIENTE/);
  });

  it("marca la venta ANULADA y libera los boletos", async () => {
    const { prisma, ventaFindUnique, ventaUpdate, boletoUpdateMany } = makePrismaMock();
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PENDIENTE" });

    await anularVentaPendiente(prisma, "v1");

    expect(ventaUpdate).toHaveBeenCalledWith({ where: { id: "v1" }, data: { estado: "ANULADA" } });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { ventaId: "v1", estado: "RESERVADO" },
      data: { estado: "DISPONIBLE", ventaId: null },
    });
  });
});
