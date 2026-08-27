import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __fake: "prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

class VentaLifecycleError extends Error {}
const reservarBoletosParaVenta = vi.fn();
vi.mock("@rifaxapp/db-tenant", () => ({
  MetodoPago: { EFECTIVO: "EFECTIVO", TRANSFERENCIA: "TRANSFERENCIA", OTRO: "OTRO", WOMPI: "WOMPI" },
  VentaLifecycleError,
  reservarBoletosParaVenta: (...args: unknown[]) => reservarBoletosParaVenta(...args),
}));

const buildWompiCheckoutUrl = vi.fn();
vi.mock("@/lib/wompi", () => ({
  buildWompiCheckoutUrl: (...args: unknown[]) => buildWompiCheckoutUrl(...args),
}));

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => headersMock() }));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { reservarBoletos, iniciarPagoWompi } = await import("./actions.js");

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

describe("reservarBoletos", () => {
  const validFields = { rifaId: "r1", metodoPago: "TRANSFERENCIA", numeros: ["4"] };

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "cli1", rol: "CLIENTE", tenantId: "t1" } });
    reservarBoletosParaVenta.mockResolvedValue({ ventaId: "v1", montoTotal: 15 });
  });

  it("rechaza si la sesión no es CLIENTE", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "VENDEDOR", tenantId: "t1" } });
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(reservarBoletosParaVenta).not.toHaveBeenCalled();
  });

  it("rechaza un método de pago que no sea manual (ej. WOMPI)", async () => {
    const result = await reservarBoletos(undefined, formDataFrom({ ...validFields, metodoPago: "WOMPI" }));
    expect(result?.error).toMatch(/método de pago/i);
    expect(reservarBoletosParaVenta).not.toHaveBeenCalled();
  });

  it("rechaza sin boletos seleccionados", async () => {
    const result = await reservarBoletos(undefined, formDataFrom({ ...validFields, numeros: [] }));
    expect(result?.error).toMatch(/elegí/i);
  });

  it("propaga el error del helper compartido (ej. rifa no activa)", async () => {
    reservarBoletosParaVenta.mockRejectedValue(new VentaLifecycleError("La rifa no está activa"));
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result?.error).toBe("La rifa no está activa");
  });

  it("reserva vía el helper compartido con el método de pago elegido", async () => {
    const result = await reservarBoletos(undefined, formDataFrom(validFields));
    expect(result).toBeUndefined();
    expect(reservarBoletosParaVenta).toHaveBeenCalledWith(expect.anything(), {
      rifaId: "r1",
      clienteId: "cli1",
      numeros: [4],
      metodoPago: "TRANSFERENCIA",
    });
  });
});

describe("iniciarPagoWompi", () => {
  const validFields = { rifaId: "r1", numeros: ["4"] };

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "cli1", rol: "CLIENTE", tenantId: "t1" } });
    reservarBoletosParaVenta.mockResolvedValue({ ventaId: "v1", montoTotal: 15 });
    headersMock.mockReturnValue(new Map([["host", "acme.localhost:3003"]]));
    buildWompiCheckoutUrl.mockReturnValue("https://checkout.wompi.co/p/?fake=1");
  });

  it("rechaza si la sesión no es CLIENTE", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", rol: "VENDEDOR", tenantId: "t1" } });
    const result = await iniciarPagoWompi(undefined, formDataFrom(validFields));
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(reservarBoletosParaVenta).not.toHaveBeenCalled();
  });

  it("rechaza sin boletos seleccionados", async () => {
    const result = await iniciarPagoWompi(undefined, formDataFrom({ ...validFields, numeros: [] }));
    expect(result?.error).toMatch(/elegí/i);
  });

  it("propaga el error del helper compartido sin redirigir", async () => {
    reservarBoletosParaVenta.mockRejectedValue(new VentaLifecycleError("Algunos números ya no están disponibles"));
    const result = await iniciarPagoWompi(undefined, formDataFrom(validFields));
    expect(result?.error).toBe("Algunos números ya no están disponibles");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("reserva forzando metodoPago WOMPI y redirige a la URL de checkout", async () => {
    await expect(iniciarPagoWompi(undefined, formDataFrom(validFields))).rejects.toThrow(
      "REDIRECT:https://checkout.wompi.co/p/?fake=1",
    );

    expect(reservarBoletosParaVenta).toHaveBeenCalledWith(expect.anything(), {
      rifaId: "r1",
      clienteId: "cli1",
      numeros: [4],
      metodoPago: "WOMPI",
    });
    expect(buildWompiCheckoutUrl).toHaveBeenCalledWith({
      reference: "t1--v1",
      amountInCents: 1500,
      redirectUrl: "http://acme.localhost:3003/mis-boletos?wompi=1",
    });
  });
});
