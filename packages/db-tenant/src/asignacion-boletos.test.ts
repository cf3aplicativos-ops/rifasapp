import { describe, expect, it, vi } from "vitest";
import {
  asignarBoletosConsecutivo,
  asignarBoletosAleatorio,
  asignarBoletosAbonados,
  AsignacionError,
} from "./asignacion-boletos";

function makePrismaMock() {
  const boletoFindMany = vi.fn();
  const boletoUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const boletoFindUnique = vi.fn();
  const boletoUpdate = vi.fn();
  const abonadoFindMany = vi.fn();

  const prisma = {
    boleto: {
      findMany: boletoFindMany,
      updateMany: boletoUpdateMany,
      findUnique: boletoFindUnique,
      update: boletoUpdate,
    },
    abonado: { findMany: abonadoFindMany },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { prisma, boletoFindMany, boletoUpdateMany, boletoFindUnique, boletoUpdate, abonadoFindMany };
}

describe("asignarBoletosConsecutivo", () => {
  it("rechaza una cantidad no entera o <= 0", async () => {
    const { prisma } = makePrismaMock();
    await expect(
      asignarBoletosConsecutivo(prisma, { rifaId: "r1", target: { sedeId: "s1" }, cantidad: 0 }),
    ).rejects.toThrow(AsignacionError);
  });

  it("tira si no hay suficientes boletos libres", async () => {
    const { prisma, boletoFindMany } = makePrismaMock();
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1 }]);

    await expect(
      asignarBoletosConsecutivo(prisma, { rifaId: "r1", target: { sedeId: "s1" }, cantidad: 5 }),
    ).rejects.toThrow(/Solo hay 1/);
  });

  it("asigna los N números libres más bajos a una sede, modo CONSECUTIVO", async () => {
    const { prisma, boletoFindMany, boletoUpdateMany } = makePrismaMock();
    boletoFindMany.mockResolvedValue([
      { id: "b1", numero: 1 },
      { id: "b2", numero: 2 },
      { id: "b3", numero: 3 },
    ]);

    const result = await asignarBoletosConsecutivo(prisma, {
      rifaId: "r1",
      target: { sedeId: "s1" },
      cantidad: 2,
    });

    expect(result).toEqual({ numeros: [1, 2] });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b1", "b2"] } },
      data: { asignadoASedeId: "s1", asignadoAVendedorId: null, asignacionModo: "CONSECUTIVO" },
    });
  });

  it("asigna a un vendedor (asignadoASedeId queda null)", async () => {
    const { prisma, boletoFindMany, boletoUpdateMany } = makePrismaMock();
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1 }]);

    await asignarBoletosConsecutivo(prisma, {
      rifaId: "r1",
      target: { vendedorId: "v1" },
      cantidad: 1,
    });

    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b1"] } },
      data: { asignadoASedeId: null, asignadoAVendedorId: "v1", asignacionModo: "CONSECUTIVO" },
    });
  });
});

describe("asignarBoletosAleatorio", () => {
  it("tira si no hay suficientes boletos libres", async () => {
    const { prisma, boletoFindMany } = makePrismaMock();
    boletoFindMany.mockResolvedValue([{ id: "b1", numero: 1 }]);

    await expect(
      asignarBoletosAleatorio(prisma, { rifaId: "r1", target: { sedeId: "s1" }, cantidad: 3 }),
    ).rejects.toThrow(/Solo hay 1/);
  });

  it("asigna exactamente `cantidad` boletos del pool libre, modo ALEATORIO", async () => {
    const { prisma, boletoFindMany, boletoUpdateMany } = makePrismaMock();
    const libres = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, numero: i + 1 }));
    boletoFindMany.mockResolvedValue(libres);

    const result = await asignarBoletosAleatorio(prisma, {
      rifaId: "r1",
      target: { vendedorId: "v1" },
      cantidad: 4,
    });

    expect(result.numeros).toHaveLength(4);
    // todos los números elegidos vienen del pool libre.
    for (const n of result.numeros) {
      expect(libres.some((b) => b.numero === n)).toBe(true);
    }
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: expect.any(Array) } },
      data: { asignadoASedeId: null, asignadoAVendedorId: "v1", asignacionModo: "ALEATORIO" },
    });
    const idsAsignados = boletoUpdateMany.mock.calls[0]?.[0].where.id.in;
    expect(idsAsignados).toHaveLength(4);
  });
});

describe("asignarBoletosAbonados", () => {
  it("asigna el número preferido de cada abonado cuando está libre", async () => {
    const { prisma, abonadoFindMany, boletoFindUnique, boletoUpdate } = makePrismaMock();
    abonadoFindMany.mockResolvedValue([{ id: "a1", nombre: "María", numero: 7 }]);
    boletoFindUnique.mockResolvedValue({
      id: "b7",
      numero: 7,
      estado: "DISPONIBLE",
      asignadoASedeId: null,
      asignadoAVendedorId: null,
    });

    const { resultados } = await asignarBoletosAbonados(prisma, {
      rifaId: "r1",
      target: { vendedorId: "v1" },
    });

    expect(resultados).toEqual([{ abonadoId: "a1", nombre: "María", numero: 7, ok: true }]);
    expect(boletoUpdate).toHaveBeenCalledWith({
      where: { id: "b7" },
      data: {
        asignadoASedeId: null,
        asignadoAVendedorId: "v1",
        asignacionModo: "ABONADOS",
        abonadoId: "a1",
      },
    });
  });

  it("reporta fallido (sin frenar a los demás) si el número no existe en la rifa", async () => {
    const { prisma, abonadoFindMany, boletoFindUnique, boletoUpdate } = makePrismaMock();
    abonadoFindMany.mockResolvedValue([
      { id: "a1", nombre: "María", numero: 999 },
      { id: "a2", nombre: "Pedro", numero: 3 },
    ]);
    boletoFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "b3",
        numero: 3,
        estado: "DISPONIBLE",
        asignadoASedeId: null,
        asignadoAVendedorId: null,
      });

    const { resultados } = await asignarBoletosAbonados(prisma, {
      rifaId: "r1",
      target: { sedeId: "s1" },
    });

    expect(resultados[0]).toMatchObject({ abonadoId: "a1", ok: false, motivo: expect.stringMatching(/no existe/) });
    expect(resultados[1]).toMatchObject({ abonadoId: "a2", ok: true });
    expect(boletoUpdate).toHaveBeenCalledTimes(1);
  });

  it("reporta fallido si el número ya está vendido/reservado o ya tiene dueño", async () => {
    const { prisma, abonadoFindMany, boletoFindUnique, boletoUpdate } = makePrismaMock();
    abonadoFindMany.mockResolvedValue([
      { id: "a1", nombre: "Vendido", numero: 1 },
      { id: "a2", nombre: "YaAsignado", numero: 2 },
    ]);
    boletoFindUnique
      .mockResolvedValueOnce({ id: "b1", numero: 1, estado: "VENDIDO", asignadoASedeId: null, asignadoAVendedorId: null })
      .mockResolvedValueOnce({ id: "b2", numero: 2, estado: "DISPONIBLE", asignadoASedeId: "s2", asignadoAVendedorId: null });

    const { resultados } = await asignarBoletosAbonados(prisma, {
      rifaId: "r1",
      target: { sedeId: "s1" },
    });

    expect(resultados[0]).toMatchObject({ ok: false, motivo: expect.stringMatching(/vendido o reservado/) });
    expect(resultados[1]).toMatchObject({ ok: false, motivo: expect.stringMatching(/otro dueño/) });
    expect(boletoUpdate).not.toHaveBeenCalled();
  });
});
