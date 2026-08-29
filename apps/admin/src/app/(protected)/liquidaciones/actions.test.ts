import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __tag: "tenant-prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

const crearLiquidacionCompartida = vi.fn();
class LiquidacionError extends Error {}
vi.mock("@rifaxapp/db-tenant", () => ({
  LiquidacionError,
  crearLiquidacion: (prisma: unknown, params: unknown) => crearLiquidacionCompartida(prisma, params),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { crearLiquidacion } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const validFields = { vendedorId: "v1", periodoDesde: "2026-08-01", periodoHasta: "2026-08-31" };

describe("crearLiquidacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    const result = await crearLiquidacion(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(crearLiquidacionCompartida).not.toHaveBeenCalled();
  });

  it("rechaza sin vendedor elegido", async () => {
    const result = await crearLiquidacion(undefined, formDataFrom({ ...validFields, vendedorId: "" }));
    expect(result?.error).toMatch(/elegí un vendedor/i);
  });

  it("rechaza fechas inválidas", async () => {
    const result = await crearLiquidacion(
      undefined,
      formDataFrom({ ...validFields, periodoDesde: "no-es-fecha" }),
    );
    expect(result?.error).toMatch(/período válido/i);
  });

  it("rechaza si el inicio es posterior al fin", async () => {
    const result = await crearLiquidacion(
      undefined,
      formDataFrom({ ...validFields, periodoDesde: "2026-09-01", periodoHasta: "2026-08-01" }),
    );
    expect(result?.error).toMatch(/no puede ser posterior/i);
  });

  it("extiende periodoHasta al final del día antes de delegar", async () => {
    crearLiquidacionCompartida.mockResolvedValue({
      cantidadVentas: 3,
      montoVentas: 300,
      montoComision: 30,
    });

    await crearLiquidacion(undefined, formDataFrom(validFields));

    const llamada = crearLiquidacionCompartida.mock.calls[0]?.[1];
    expect(llamada.periodoHasta.getHours()).toBe(23);
    expect(llamada.vendedorId).toBe("v1");
    expect(llamada.generadaPorId).toBe("admin1");
  });

  it("devuelve un resumen legible en éxito", async () => {
    crearLiquidacionCompartida.mockResolvedValue({
      cantidadVentas: 3,
      montoVentas: 300,
      montoComision: 30,
    });

    const result = await crearLiquidacion(undefined, formDataFrom(validFields));

    expect(result?.success).toMatch(/3 ventas/);
    expect(result?.success).toMatch(/30\.00/);
  });

  it("propaga un LiquidacionError como mensaje legible", async () => {
    crearLiquidacionCompartida.mockRejectedValue(
      new LiquidacionError("No hay ventas pendientes de liquidar en ese período"),
    );

    const result = await crearLiquidacion(undefined, formDataFrom(validFields));

    expect(result?.error).toBe("No hay ventas pendientes de liquidar en ese período");
  });
});
