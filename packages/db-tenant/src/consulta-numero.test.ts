import { describe, expect, it, vi } from "vitest";
import { consultarEstadoNumero } from "./consulta-numero";

function makePrismaMock() {
  const boletoFindUnique = vi.fn();
  const prisma = {
    boleto: { findUnique: boletoFindUnique },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { prisma, boletoFindUnique };
}

describe("consultarEstadoNumero", () => {
  it("NO_EXISTE si el número no está en la rifa", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue(null);

    const result = await consultarEstadoNumero(prisma, { rifaId: "r1", numero: 99 });
    expect(result).toEqual({ tipo: "NO_EXISTE" });
  });

  it("LIBRE si no tiene dueño", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: null,
      asignadoAVendedorId: null,
    });

    const result = await consultarEstadoNumero(prisma, { rifaId: "r1", numero: 5 });
    expect(result).toEqual({ tipo: "LIBRE", boletoId: "b1", estado: "DISPONIBLE" });
  });

  it("PROPIO si lo tiene el vendedor que consulta", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: null,
      asignadoAVendedorId: "v1",
    });

    const result = await consultarEstadoNumero(prisma, {
      rifaId: "r1",
      numero: 5,
      comoVendedorId: "v1",
    });
    expect(result).toEqual({ tipo: "PROPIO", boletoId: "b1", estado: "DISPONIBLE" });
  });

  it("PROPIO si lo tiene la sede que consulta", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: "sede1",
      asignadoAVendedorId: null,
    });

    const result = await consultarEstadoNumero(prisma, {
      rifaId: "r1",
      numero: 5,
      comoSedeId: "sede1",
    });
    expect(result).toEqual({ tipo: "PROPIO", boletoId: "b1", estado: "DISPONIBLE" });
  });

  it("SEDE si lo tiene una sede distinta a la que consulta", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: "sede1",
      asignadoASede: { nombre: "Sede Centro" },
      asignadoAVendedorId: null,
    });

    const result = await consultarEstadoNumero(prisma, { rifaId: "r1", numero: 5, comoVendedorId: "v9" });
    expect(result).toEqual({
      tipo: "SEDE",
      boletoId: "b1",
      estado: "DISPONIBLE",
      sedeId: "sede1",
      sedeNombre: "Sede Centro",
    });
  });

  it("OTRO_VENDEDOR si lo tiene otro vendedor", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: null,
      asignadoAVendedorId: "v2",
      asignadoAVendedor: { nombre: "Carlos", email: "carlos@example.com" },
    });

    const result = await consultarEstadoNumero(prisma, { rifaId: "r1", numero: 5, comoVendedorId: "v1" });
    expect(result).toEqual({
      tipo: "OTRO_VENDEDOR",
      boletoId: "b1",
      estado: "DISPONIBLE",
      vendedorId: "v2",
      vendedorNombre: "Carlos",
    });
  });

  it("OTRO_VENDEDOR usa el email si el vendedor no tiene nombre cargado", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      estado: "DISPONIBLE",
      asignadoASedeId: null,
      asignadoAVendedorId: "v2",
      asignadoAVendedor: { nombre: null, email: "carlos@example.com" },
    });

    const result = await consultarEstadoNumero(prisma, { rifaId: "r1", numero: 5 });
    expect(result).toMatchObject({ tipo: "OTRO_VENDEDOR", vendedorNombre: "carlos@example.com" });
  });
});
