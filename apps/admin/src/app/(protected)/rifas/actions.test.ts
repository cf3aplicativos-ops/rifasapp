import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const rifaFindUnique = vi.fn();
const rifaCreate = vi.fn();
const rifaUpdate = vi.fn();
const boletoCreateMany = vi.fn();
const boletoFindUnique = vi.fn();
const boletoUpdateMany = vi.fn();
const ventaFindUnique = vi.fn();
const transaction = vi.fn().mockResolvedValue(undefined);
const confirmarPagoDeVenta = vi.fn().mockResolvedValue(undefined);
const anularVentaPendiente = vi.fn().mockResolvedValue(undefined);

const getTenantPrismaClient = vi.fn().mockResolvedValue({
  rifa: { findUnique: rifaFindUnique, create: rifaCreate, update: rifaUpdate },
  boleto: { createMany: boletoCreateMany, findUnique: boletoFindUnique, updateMany: boletoUpdateMany },
  venta: { findUnique: ventaFindUnique },
  $transaction: transaction,
});
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  RifaEstado: { BORRADOR: "BORRADOR", ACTIVA: "ACTIVA", CERRADA: "CERRADA", CANCELADA: "CANCELADA" },
  BoletoEstado: { DISPONIBLE: "DISPONIBLE", RESERVADO: "RESERVADO", VENDIDO: "VENDIDO" },
  confirmarPagoDeVenta: (prisma: unknown, ventaId: string) => confirmarPagoDeVenta(prisma, ventaId),
  anularVentaPendiente: (prisma: unknown, ventaId: string) => anularVentaPendiente(prisma, ventaId),
}));

const notificarGanador = vi.fn().mockResolvedValue(undefined);
const notificarPagoConfirmado = vi.fn().mockResolvedValue(undefined);
vi.mock("@rifaxapp/notifications", () => ({
  notificarGanador: (prisma: unknown, rifaId: string) => notificarGanador(prisma, rifaId),
  notificarPagoConfirmado: (prisma: unknown, ventaId: string) => notificarPagoConfirmado(prisma, ventaId),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { crearRifa, activarRifa, cancelarRifa, cerrarRifa, confirmarPagoVenta, anularVenta } =
  await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const validFields = { nombre: "Rifa moto", precioBoleto: "10", cantidadBoletos: "100" };

describe("crearRifa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "VENDEDOR", tenantId: "t1" } });
    const result = await crearRifa(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(rifaCreate).not.toHaveBeenCalled();
  });

  it("rechaza sin nombre", async () => {
    const result = await crearRifa(undefined, formDataFrom({ ...validFields, nombre: "" }));
    expect(result?.error).toMatch(/nombre/i);
  });

  it("rechaza un precio inválido", async () => {
    const result = await crearRifa(undefined, formDataFrom({ ...validFields, precioBoleto: "0" }));
    expect(result?.error).toMatch(/precio/i);
  });

  it("rechaza una cantidad de boletos no entera", async () => {
    const result = await crearRifa(undefined, formDataFrom({ ...validFields, cantidadBoletos: "10.5" }));
    expect(result?.error).toMatch(/cantidad/i);
  });

  it("rechaza una cantidad de boletos por encima del tope", async () => {
    const result = await crearRifa(undefined, formDataFrom({ ...validFields, cantidadBoletos: "5000" }));
    expect(result?.error).toMatch(/2000/);
  });

  it("crea la rifa en BORRADOR con el creador de la sesión", async () => {
    const result = await crearRifa(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(rifaCreate).toHaveBeenCalledWith({
      data: {
        nombre: "Rifa moto",
        descripcion: null,
        precioBoleto: 10,
        cantidadBoletos: 100,
        creadoPorId: "u1",
      },
    });
  });
});

describe("activarRifa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("tira si la rifa no está en BORRADOR", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", cantidadBoletos: 10 });
    await expect(activarRifa("r1")).rejects.toThrow(/BORRADOR/);
    expect(boletoCreateMany).not.toHaveBeenCalled();
  });

  it("genera los boletos 1..N y activa la rifa", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "BORRADOR", cantidadBoletos: 3 });
    await activarRifa("r1");
    expect(boletoCreateMany).toHaveBeenCalledWith({
      data: [
        { rifaId: "r1", numero: 1 },
        { rifaId: "r1", numero: 2 },
        { rifaId: "r1", numero: 3 },
      ],
    });
    expect(rifaUpdate).toHaveBeenCalledWith({ where: { id: "r1" }, data: { estado: "ACTIVA" } });
  });
});

describe("cancelarRifa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("tira si la rifa ya está CERRADA", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "CERRADA" });
    await expect(cancelarRifa("r1")).rejects.toThrow(/BORRADOR o ACTIVA/);
  });

  it("cancela una rifa ACTIVA", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA" });
    await cancelarRifa("r1");
    expect(rifaUpdate).toHaveBeenCalledWith({ where: { id: "r1" }, data: { estado: "CANCELADA" } });
  });
});

describe("cerrarRifa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si la rifa no está ACTIVA", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "BORRADOR" });
    const result = await cerrarRifa(undefined, formDataFrom({ rifaId: "r1", numeroGanador: "5" }));
    expect(result?.error).toMatch(/ACTIVA/);
  });

  it("rechaza si el boleto ganador no fue vendido", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA" });
    boletoFindUnique.mockResolvedValue({ id: "b1", estado: "DISPONIBLE" });
    const result = await cerrarRifa(undefined, formDataFrom({ rifaId: "r1", numeroGanador: "5" }));
    expect(result?.error).toMatch(/no existe o no fue vendido/);
    expect(rifaUpdate).not.toHaveBeenCalled();
  });

  it("cierra la rifa con el boleto ganador y notifica al ganador", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA" });
    boletoFindUnique.mockResolvedValue({ id: "b1", estado: "VENDIDO" });
    const result = await cerrarRifa(undefined, formDataFrom({ rifaId: "r1", numeroGanador: "5" }));
    expect(result).toBeUndefined();
    expect(rifaUpdate).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { estado: "CERRADA", fechaSorteo: expect.any(Date), boletoGanadorId: "b1" },
    });
    expect(notificarGanador).toHaveBeenCalledWith(expect.anything(), "r1");
  });
});

describe("confirmarPagoVenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("tira si la venta no existe", async () => {
    ventaFindUnique.mockResolvedValue(null);
    await expect(confirmarPagoVenta("v1")).rejects.toThrow(/PENDIENTE/);
    expect(confirmarPagoDeVenta).not.toHaveBeenCalled();
  });

  it("delega la transacción al helper compartido y notifica al cliente", async () => {
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PENDIENTE", rifaId: "r1" });
    await confirmarPagoVenta("v1");
    expect(confirmarPagoDeVenta).toHaveBeenCalledWith(expect.anything(), "v1");
    expect(notificarPagoConfirmado).toHaveBeenCalledWith(expect.anything(), "v1");
  });

  it("propaga el error del helper si la venta no está PENDIENTE", async () => {
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PAGADA", rifaId: "r1" });
    confirmarPagoDeVenta.mockRejectedValueOnce(new Error("Solo se puede confirmar una venta en estado PENDIENTE"));
    await expect(confirmarPagoVenta("v1")).rejects.toThrow(/PENDIENTE/);
  });
});

describe("anularVenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("tira si la venta no existe", async () => {
    ventaFindUnique.mockResolvedValue(null);
    await expect(anularVenta("v1")).rejects.toThrow(/PENDIENTE/);
    expect(anularVentaPendiente).not.toHaveBeenCalled();
  });

  it("delega la transacción al helper compartido de @rifaxapp/db-tenant", async () => {
    ventaFindUnique.mockResolvedValue({ id: "v1", estado: "PENDIENTE", rifaId: "r1" });
    await anularVenta("v1");
    expect(anularVentaPendiente).toHaveBeenCalledWith(expect.anything(), "v1");
  });
});
