import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const abonadoCreate = vi.fn();
const abonadoDelete = vi.fn();
const getTenantPrismaClient = vi.fn().mockResolvedValue({
  abonado: { create: abonadoCreate, delete: abonadoDelete },
});
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

// @rifaxapp/auth (assertRole) NO se mockea — lógica pura, corre real.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { crearAbonado, eliminarAbonado } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const validFields = { nombre: "María Pérez", telefono: "3001234567", numero: "7" };

describe("crearAbonado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    const result = await crearAbonado(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(abonadoCreate).not.toHaveBeenCalled();
  });

  it("rechaza sin nombre", async () => {
    const result = await crearAbonado(undefined, formDataFrom({ ...validFields, nombre: "" }));
    expect(result?.error).toMatch(/nombre/i);
  });

  it("rechaza sin teléfono", async () => {
    const result = await crearAbonado(undefined, formDataFrom({ ...validFields, telefono: "" }));
    expect(result?.error).toMatch(/teléfono/i);
  });

  it("rechaza un número negativo o no entero", async () => {
    const result = await crearAbonado(undefined, formDataFrom({ ...validFields, numero: "-1" }));
    expect(result?.error).toMatch(/número preferido/i);
  });

  it("crea el abonado con los datos válidos", async () => {
    const result = await crearAbonado(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(abonadoCreate).toHaveBeenCalledWith({
      data: { nombre: "María Pérez", telefono: "3001234567", numero: 7 },
    });
  });

  it("devuelve un error legible si el teléfono ya está registrado (unique)", async () => {
    abonadoCreate.mockRejectedValue(new Error("Unique constraint failed"));
    const result = await crearAbonado(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/ya existe un abonado/i);
  });
});

describe("eliminarAbonado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("borra el abonado por id", async () => {
    await eliminarAbonado("a1");
    expect(abonadoDelete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    await expect(eliminarAbonado("a1")).rejects.toThrow(/no tiene permiso/i);
    expect(abonadoDelete).not.toHaveBeenCalled();
  });
});
