import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __tag: "tenant-prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

const asignarBoletosConsecutivo = vi.fn();
const asignarBoletosAleatorio = vi.fn();
const asignarBoletosAbonados = vi.fn();
class AsignacionError extends Error {}
vi.mock("@rifaxapp/db-tenant", () => ({
  AsignacionError,
  asignarBoletosConsecutivo: (prisma: unknown, params: unknown) =>
    asignarBoletosConsecutivo(prisma, params),
  asignarBoletosAleatorio: (prisma: unknown, params: unknown) =>
    asignarBoletosAleatorio(prisma, params),
  asignarBoletosAbonados: (prisma: unknown, params: unknown) =>
    asignarBoletosAbonados(prisma, params),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { asignarBoletos } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("asignarBoletos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "u1", rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "CONSECUTIVO", cantidad: "5" }),
    );
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(asignarBoletosConsecutivo).not.toHaveBeenCalled();
  });

  it("rechaza sin target elegido", async () => {
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "", modo: "CONSECUTIVO", cantidad: "5" }),
    );
    expect(result?.error).toMatch(/elegí a quién/i);
  });

  it("modo CONSECUTIVO: rechaza una cantidad inválida", async () => {
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "CONSECUTIVO", cantidad: "0" }),
    );
    expect(result?.error).toMatch(/cantidad/i);
    expect(asignarBoletosConsecutivo).not.toHaveBeenCalled();
  });

  it("modo CONSECUTIVO: delega en asignarBoletosConsecutivo con el target parseado", async () => {
    asignarBoletosConsecutivo.mockResolvedValue({ numeros: [1, 2, 3] });
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "CONSECUTIVO", cantidad: "3" }),
    );
    expect(result).toEqual({ success: "Asignados: 1, 2, 3" });
    expect(asignarBoletosConsecutivo).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { rifaId: "r1", target: { sedeId: "s1" }, cantidad: 3 },
    );
  });

  it("modo ALEATORIO: delega en asignarBoletosAleatorio con target vendedor", async () => {
    asignarBoletosAleatorio.mockResolvedValue({ numeros: [4, 9] });
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "vendedor:v1", modo: "ALEATORIO", cantidad: "2" }),
    );
    expect(result).toEqual({ success: "Asignados: 4, 9" });
    expect(asignarBoletosAleatorio).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { rifaId: "r1", target: { vendedorId: "v1" }, cantidad: 2 },
    );
  });

  it("modo ABONADOS: no requiere cantidad, resume éxitos y fallidos", async () => {
    asignarBoletosAbonados.mockResolvedValue({
      resultados: [
        { abonadoId: "a1", nombre: "María", numero: 7, ok: true },
        { abonadoId: "a2", nombre: "Pedro", numero: 9, ok: false, motivo: "Ya fue vendido o reservado" },
      ],
    });
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "ABONADOS" }),
    );
    expect(result?.success).toMatch(/1 de 2 abonados asignados/);
    expect(result?.success).toMatch(/Pedro \(#9: Ya fue vendido o reservado\)/);
  });

  it("modo ABONADOS: error si no hay abonados registrados", async () => {
    asignarBoletosAbonados.mockResolvedValue({ resultados: [] });
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "ABONADOS" }),
    );
    expect(result?.error).toMatch(/no hay abonados/i);
  });

  it("propaga un AsignacionError como mensaje legible", async () => {
    asignarBoletosConsecutivo.mockRejectedValue(new AsignacionError("Solo hay 2 boletos libres"));
    const result = await asignarBoletos(
      undefined,
      formDataFrom({ rifaId: "r1", target: "sede:s1", modo: "CONSECUTIVO", cantidad: "5" }),
    );
    expect(result?.error).toBe("Solo hay 2 boletos libres");
  });
});
