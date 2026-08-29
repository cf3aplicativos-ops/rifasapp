import { describe, expect, it, vi } from "vitest";
import { solicitarTraspaso, resolverTraspaso, TraspasoError } from "./traspaso";

function makePrismaMock() {
  const boletoFindUnique = vi.fn();
  const boletoUpdate = vi.fn();
  const solicitudFindFirst = vi.fn();
  const solicitudFindUnique = vi.fn();
  const solicitudCreate = vi.fn();
  const solicitudUpdate = vi.fn();
  const usuarioFindUnique = vi.fn();

  const prisma = {
    boleto: { findUnique: boletoFindUnique, update: boletoUpdate },
    solicitudTraspaso: {
      findFirst: solicitudFindFirst,
      findUnique: solicitudFindUnique,
      create: solicitudCreate,
      update: solicitudUpdate,
    },
    usuario: { findUnique: usuarioFindUnique },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return {
    prisma,
    boletoFindUnique,
    boletoUpdate,
    solicitudFindFirst,
    solicitudFindUnique,
    solicitudCreate,
    solicitudUpdate,
    usuarioFindUnique,
  };
}

describe("solicitarTraspaso", () => {
  it("tira si el número no existe", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue(null);

    await expect(
      solicitarTraspaso(prisma, { rifaId: "r1", numero: 5, solicitanteId: "v1" }),
    ).rejects.toThrow(/no existe/);
  });

  it("tira si el número está libre", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      asignadoASedeId: null,
      asignadoAVendedorId: null,
    });

    await expect(
      solicitarTraspaso(prisma, { rifaId: "r1", numero: 5, solicitanteId: "v1" }),
    ).rejects.toThrow(/está libre/);
  });

  it("tira si el que pide ya es el dueño", async () => {
    const { prisma, boletoFindUnique } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({
      id: "b1",
      asignadoASedeId: null,
      asignadoAVendedorId: "v1",
    });

    await expect(
      solicitarTraspaso(prisma, { rifaId: "r1", numero: 5, solicitanteId: "v1" }),
    ).rejects.toThrow(/ya es tuyo/);
  });

  it("tira si ya hay una solicitud pendiente para ese boleto", async () => {
    const { prisma, boletoFindUnique, solicitudFindFirst } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({ id: "b1", asignadoASedeId: null, asignadoAVendedorId: "v2" });
    solicitudFindFirst.mockResolvedValue({ id: "s-existente" });

    await expect(
      solicitarTraspaso(prisma, { rifaId: "r1", numero: 5, solicitanteId: "v1" }),
    ).rejects.toThrow(/ya hay una solicitud pendiente/i);
  });

  it("crea la solicitud snapshoteando quién lo tiene", async () => {
    const { prisma, boletoFindUnique, solicitudFindFirst, solicitudCreate } = makePrismaMock();
    boletoFindUnique.mockResolvedValue({ id: "b1", asignadoASedeId: null, asignadoAVendedorId: "v2" });
    solicitudFindFirst.mockResolvedValue(null);
    solicitudCreate.mockResolvedValue({ id: "s1" });

    await solicitarTraspaso(prisma, { rifaId: "r1", numero: 5, solicitanteId: "v1" });

    expect(solicitudCreate).toHaveBeenCalledWith({
      data: {
        boletoId: "b1",
        rifaId: "r1",
        numero: 5,
        solicitanteId: "v1",
        poseedorId: "v2",
        poseedorSedeId: null,
        estado: "PENDIENTE",
      },
    });
  });
});

describe("resolverTraspaso", () => {
  it("tira si la solicitud ya fue resuelta", async () => {
    const { prisma, solicitudFindUnique } = makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "ACEPTADO" });

    await expect(
      resolverTraspaso(prisma, { solicitudId: "s1", resueltoPorId: "v2", decision: "ACEPTAR" }),
    ).rejects.toThrow(/ya fue resuelta/);
  });

  it("rechazar exige un motivo no vacío", async () => {
    const { prisma, solicitudFindUnique } = makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "PENDIENTE" });

    await expect(
      resolverTraspaso(prisma, { solicitudId: "s1", resueltoPorId: "v2", decision: "RECHAZAR" }),
    ).rejects.toThrow(TraspasoError);
    await expect(
      resolverTraspaso(prisma, {
        solicitudId: "s1",
        resueltoPorId: "v2",
        decision: "RECHAZAR",
        motivoRechazo: "   ",
      }),
    ).rejects.toThrow(/motivo/i);
  });

  it("rechaza guardando el motivo", async () => {
    const { prisma, solicitudFindUnique, solicitudUpdate } = makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "PENDIENTE" });

    await resolverTraspaso(prisma, {
      solicitudId: "s1",
      resueltoPorId: "v2",
      decision: "RECHAZAR",
      motivoRechazo: "  Lo necesito para un cliente propio  ",
    });

    expect(solicitudUpdate).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: {
        estado: "RECHAZADO",
        motivoRechazo: "Lo necesito para un cliente propio",
        resueltoPorId: "v2",
        resueltoAt: expect.any(Date),
      },
    });
  });

  it("al aceptar, transfiere el boleto a un solicitante VENDEDOR", async () => {
    const { prisma, solicitudFindUnique, usuarioFindUnique, boletoUpdate, solicitudUpdate } =
      makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "PENDIENTE", solicitanteId: "v1", boletoId: "b1" });
    usuarioFindUnique.mockResolvedValue({ id: "v1", rol: "VENDEDOR", sedeId: null });

    await resolverTraspaso(prisma, { solicitudId: "s1", resueltoPorId: "v2", decision: "ACEPTAR" });

    expect(boletoUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { asignadoASedeId: null, asignadoAVendedorId: "v1", asignacionModo: "TRASPASO" },
    });
    expect(solicitudUpdate).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { estado: "ACEPTADO", resueltoPorId: "v2", resueltoAt: expect.any(Date) },
    });
  });

  it("al aceptar, transfiere el boleto a la SEDE de un solicitante SEDE_ADMIN", async () => {
    const { prisma, solicitudFindUnique, usuarioFindUnique, boletoUpdate } = makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "PENDIENTE", solicitanteId: "sa1", boletoId: "b1" });
    usuarioFindUnique.mockResolvedValue({ id: "sa1", rol: "SEDE_ADMIN", sedeId: "sede1" });

    await resolverTraspaso(prisma, { solicitudId: "s1", resueltoPorId: "v2", decision: "ACEPTAR" });

    expect(boletoUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { asignadoASedeId: "sede1", asignadoAVendedorId: null, asignacionModo: "TRASPASO" },
    });
  });

  it("tira si el solicitante es SEDE_ADMIN sin sede asignada", async () => {
    const { prisma, solicitudFindUnique, usuarioFindUnique } = makePrismaMock();
    solicitudFindUnique.mockResolvedValue({ id: "s1", estado: "PENDIENTE", solicitanteId: "sa1", boletoId: "b1" });
    usuarioFindUnique.mockResolvedValue({ id: "sa1", rol: "SEDE_ADMIN", sedeId: null });

    await expect(
      resolverTraspaso(prisma, { solicitudId: "s1", resueltoPorId: "v2", decision: "ACEPTAR" }),
    ).rejects.toThrow(/no tiene una sede asignada/);
  });
});
