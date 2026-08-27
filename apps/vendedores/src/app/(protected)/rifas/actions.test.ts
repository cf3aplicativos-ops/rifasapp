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

const { registrarVenta } = await import("./actions.js");

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

const validFields = {
  rifaId: "r1",
  compradorNombre: "Juan Pérez",
  compradorTelefono: "",
  metodoPago: "EFECTIVO",
  numeros: ["1", "2"],
};

describe("registrarVenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "vend1", rol: "VENDEDOR", tenantId: "t1" } });
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "ACTIVA", precioBoleto: 10 });
    boletoFindMany.mockResolvedValue([
      { id: "b1", numero: 1, estado: "DISPONIBLE" },
      { id: "b2", numero: 2, estado: "DISPONIBLE" },
    ]);
    boletoUpdateMany.mockResolvedValue({ count: 2 });
    ventaCreate.mockResolvedValue({ id: "v1" });
  });

  it("rechaza si la sesión no es VENDEDOR", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(ventaCreate).not.toHaveBeenCalled();
  });

  it("rechaza sin nombre de comprador", async () => {
    const result = await registrarVenta(undefined, formDataFrom({ ...validFields, compradorNombre: "" }));
    expect(result?.error).toMatch(/nombre/i);
  });

  it("rechaza sin boletos seleccionados", async () => {
    const result = await registrarVenta(undefined, formDataFrom({ ...validFields, numeros: [] }));
    expect(result?.error).toMatch(/elegí/i);
  });

  it("rechaza si la rifa no está ACTIVA", async () => {
    rifaFindUnique.mockResolvedValue({ id: "r1", estado: "BORRADOR", precioBoleto: 10 });
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/activa/i);
  });

  it("rechaza si algún boleto ya no está disponible (condición de carrera)", async () => {
    boletoUpdateMany.mockResolvedValue({ count: 1 });
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/ya no están disponibles/);
  });

  it("registra la venta como PAGADA y los boletos como VENDIDO", async () => {
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(ventaCreate).toHaveBeenCalledWith({
      data: {
        rifaId: "r1",
        vendedorId: "vend1",
        compradorNombre: "Juan Pérez",
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
