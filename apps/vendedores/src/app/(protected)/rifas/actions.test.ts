import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __tag: "tenant-prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

// Fase 19B: registrarVenta ya no arma su propia transacción — delega en
// venderBoletosComoVendedor (@rifaxapp/db-tenant), que es donde vive ahora
// la lógica real (incluida assertBoletosVendibles) y sus propios tests
// (ver venta-lifecycle.test.ts). Acá solo se prueba la delegación: RBAC,
// validación de formData, y que el error del helper compartido se propague.
const venderBoletosComoVendedor = vi.fn();
class VentaLifecycleError extends Error {}
vi.mock("@rifaxapp/db-tenant", () => ({
  MetodoPago: { EFECTIVO: "EFECTIVO", TRANSFERENCIA: "TRANSFERENCIA", OTRO: "OTRO" },
  VentaLifecycleError,
  venderBoletosComoVendedor: (prisma: unknown, params: unknown) =>
    venderBoletosComoVendedor(prisma, params),
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
    venderBoletosComoVendedor.mockResolvedValue({ ventaId: "v1", montoTotal: 20 });
  });

  it("rechaza si la sesión no es VENDEDOR", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(venderBoletosComoVendedor).not.toHaveBeenCalled();
  });

  it("rechaza sin nombre de comprador", async () => {
    const result = await registrarVenta(undefined, formDataFrom({ ...validFields, compradorNombre: "" }));
    expect(result?.error).toMatch(/nombre/i);
    expect(venderBoletosComoVendedor).not.toHaveBeenCalled();
  });

  it("rechaza sin boletos seleccionados", async () => {
    const result = await registrarVenta(undefined, formDataFrom({ ...validFields, numeros: [] }));
    expect(result?.error).toMatch(/elegí/i);
    expect(venderBoletosComoVendedor).not.toHaveBeenCalled();
  });

  it("propaga el error del helper compartido (ej. rifa no activa, boleto de otro vendedor)", async () => {
    venderBoletosComoVendedor.mockRejectedValue(
      new VentaLifecycleError("El boleto #1 está asignado a otro vendedor"),
    );
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/asignado a otro vendedor/);
  });

  it("delega en venderBoletosComoVendedor con los datos del vendedor de la sesión", async () => {
    const result = await registrarVenta(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(venderBoletosComoVendedor).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      {
        rifaId: "r1",
        vendedorId: "vend1",
        numeros: [1, 2],
        compradorNombre: "Juan Pérez",
        compradorTelefono: null,
        metodoPago: "EFECTIVO",
      },
    );
  });
});
