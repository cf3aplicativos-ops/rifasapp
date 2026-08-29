import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __tag: "tenant-prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

const consultarEstadoNumero = vi.fn();
const solicitarTraspaso = vi.fn();
class TraspasoError extends Error {}
vi.mock("@rifaxapp/db-tenant", () => ({
  TraspasoError,
  consultarEstadoNumero: (prisma: unknown, params: unknown) =>
    consultarEstadoNumero(prisma, params),
  solicitarTraspaso: (prisma: unknown, params: unknown) => solicitarTraspaso(prisma, params),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { consultarNumero, solicitarTraspasoDesdeConsulta } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("consultarNumero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza roles que no son TENANT_ADMIN ni SEDE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    const result = await consultarNumero(
      undefined,
      formDataFrom({ rifaId: "r1", numero: "5" }),
    );
    expect(result && "error" in result ? result.error : undefined).toMatch(/no tiene permiso/i);
  });

  it("rechaza sin rifa elegida", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
    const result = await consultarNumero(undefined, formDataFrom({ rifaId: "", numero: "5" }));
    expect(result && "error" in result ? result.error : undefined).toMatch(/elegí una rifa/i);
  });

  it("SEDE_ADMIN: pasa comoSedeId de la sesión", async () => {
    authMock.mockResolvedValue({ user: { rol: "SEDE_ADMIN", tenantId: "t1", sedeId: "sede1" } });
    consultarEstadoNumero.mockResolvedValue({ tipo: "LIBRE", boletoId: "b1", estado: "DISPONIBLE" });

    await consultarNumero(undefined, formDataFrom({ rifaId: "r1", numero: "5" }));

    expect(consultarEstadoNumero).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { rifaId: "r1", numero: 5, comoSedeId: "sede1" },
    );
  });

  it("TENANT_ADMIN: no pasa comoSedeId", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1", sedeId: null } });
    consultarEstadoNumero.mockResolvedValue({ tipo: "LIBRE", boletoId: "b1", estado: "DISPONIBLE" });

    const result = await consultarNumero(undefined, formDataFrom({ rifaId: "r1", numero: "5" }));

    expect(consultarEstadoNumero).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { rifaId: "r1", numero: 5, comoSedeId: undefined },
    );
    expect(result).toMatchObject({ rifaId: "r1", numero: 5 });
  });
});

describe("solicitarTraspasoDesdeConsulta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no es SEDE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
    const result = await solicitarTraspasoDesdeConsulta(
      undefined,
      formDataFrom({ rifaId: "r1", numero: "5" }),
    );
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(solicitarTraspaso).not.toHaveBeenCalled();
  });

  it("delega en solicitarTraspaso con el id de la sesión", async () => {
    authMock.mockResolvedValue({ user: { id: "sa1", rol: "SEDE_ADMIN", tenantId: "t1" } });
    solicitarTraspaso.mockResolvedValue({ id: "s1" });

    const result = await solicitarTraspasoDesdeConsulta(
      undefined,
      formDataFrom({ rifaId: "r1", numero: "5" }),
    );

    expect(solicitarTraspaso).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { rifaId: "r1", numero: 5, solicitanteId: "sa1" },
    );
    expect(result?.success).toMatch(/5/);
  });

  it("propaga un TraspasoError como mensaje legible", async () => {
    authMock.mockResolvedValue({ user: { id: "sa1", rol: "SEDE_ADMIN", tenantId: "t1" } });
    solicitarTraspaso.mockRejectedValue(new TraspasoError("Ya hay una solicitud pendiente"));

    const result = await solicitarTraspasoDesdeConsulta(
      undefined,
      formDataFrom({ rifaId: "r1", numero: "5" }),
    );

    expect(result?.error).toBe("Ya hay una solicitud pendiente");
  });
});
