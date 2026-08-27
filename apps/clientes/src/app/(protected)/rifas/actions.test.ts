import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const rifaFindUnique = vi.fn();
const boletoFindMany = vi.fn();
const ventaCreate = vi.fn();
const boletoUpdateMany = vi.fn();

const getTenantPrismaClient = vi.fn().mockResolvedValue({
  rifa: { findUnique: rifaFindUnique },
  boleto: { findMany: boletoFindMany, updateMany: boletoUpdateMany },
  venta: { create: ventaCreate },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      venta: { create: ventaCreate },
      boleto: { updateMany: boletoUpdateMany },
    }),
});
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  RifaEstado: { BORRADOR: "BORRADOR", ACTIVA: "ACTIVA", CERRADA: "CERRADA", CANCELADA: "CANCELADA" },
  BoletoEstado: { DISPONIBLE: "DISPONIBLE", RESERVADO: "RESERVADO", VENDIDO: "VENDIDO" },
  VentaEstado: { PENDIENTE: "PENDIENTE", PAGADA: "PAGADA", ANULADA: "ANULADA" },
  MetodoPago: { EFECTIVO: "EFECTIVO", TRANSFERENCIA: "TRANSFERENCIA", OTRO: "OTRO" },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { reservarBoletos } = await import("./actions.js");

function formDataFrom(fields: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) formData.append(key, v);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

const validFields = { rifaId: "r1", metodoPago: "TRANSFERENCIA", numeros: ["4"] };

describe("reservarBoletos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "cli1", rol: "CLIENTE", tenantId: "t1" } });
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 15 });
    boletoFindMany.mockResolvedValue([{ id: "b4", numero: 4, estado: "DISPONIBLE" }]);
    boletoUpdateMany.mockResolvedValue({ count: 1 });
    ventaCreate.mockResolvedValue({ id: "v1" });
  });

  it("rechaza si la sesión no es CLIENTE", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "VENDEDOR", tenantId: "t1" } });
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(ventaCreate).not.toHaveBeenCalled();
  });

  it("rechaza sin boletos seleccionados", async () => {
    const result = await reservarBoletos(undefined, formDataFrom({ ...validFields, numeros: [] }));
    expect(result?.error).toMatch(/elegí/i);
  });

  it("rechaza si la rifa no está ACTIVA", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "CERRADA", precioBoleto: 15 });
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/activa/i);
  });

  it("rechaza si el boleto ya no está disponible (condición de carrera)", async () => {
    boletoUpdateMany.mockResolvedValue({ count: 0 });
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/ya no están disponibles/);
  });

  it("crea la venta PENDIENTE y reserva los boletos", async () => {
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(ventaCreate).toHaveBeenCalledWith({
      data: {
        rifaId: "r1",
        clienteId: "cli1",
        montoTotal: 15,
        metodoPago: "TRANSFERENCIA",
        estado: "PENDIENTE",
      },
    });
    expect(boletoUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b4"] }, estado: "DISPONIBLE" },
      data: { estado: "RESERVADO", ventaId: "v1" },
    });
  });
});
