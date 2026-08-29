import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const getTenantPrismaClient = vi.fn().mockResolvedValue({ __tag: "tenant-prisma" });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

const resolverTraspaso = vi.fn();
class TraspasoError extends Error {}
vi.mock("@rifaxapp/db-tenant", () => ({
  TraspasoError,
  resolverTraspaso: (prisma: unknown, params: unknown) => resolverTraspaso(prisma, params),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { aceptarTraspaso, rechazarTraspaso } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("aceptarTraspaso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "sa1", rol: "SEDE_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si no es SEDE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
    await expect(aceptarTraspaso("s1")).rejects.toThrow(/no tiene permiso/i);
    expect(resolverTraspaso).not.toHaveBeenCalled();
  });

  it("delega en resolverTraspaso con decision ACEPTAR", async () => {
    await aceptarTraspaso("s1");
    expect(resolverTraspaso).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { solicitudId: "s1", resueltoPorId: "sa1", decision: "ACEPTAR" },
    );
  });
});

describe("rechazarTraspaso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "sa1", rol: "SEDE_ADMIN", tenantId: "t1" } });
  });

  it("rechaza si no es SEDE_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
    const result = await rechazarTraspaso(
      undefined,
      formDataFrom({ solicitudId: "s1", motivoRechazo: "No alcanza" }),
    );
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(resolverTraspaso).not.toHaveBeenCalled();
  });

  it("delega en resolverTraspaso con decision RECHAZAR y el motivo", async () => {
    const result = await rechazarTraspaso(
      undefined,
      formDataFrom({ solicitudId: "s1", motivoRechazo: "  Lo necesito yo  " }),
    );
    expect(result).toBeUndefined();
    expect(resolverTraspaso).toHaveBeenCalledWith(
      { __tag: "tenant-prisma" },
      { solicitudId: "s1", resueltoPorId: "sa1", decision: "RECHAZAR", motivoRechazo: "Lo necesito yo" },
    );
  });

  it("propaga un TraspasoError como mensaje legible", async () => {
    resolverTraspaso.mockRejectedValue(new TraspasoError("Tenés que indicar el motivo del rechazo"));
    const result = await rechazarTraspaso(
      undefined,
      formDataFrom({ solicitudId: "s1", motivoRechazo: "" }),
    );
    expect(result?.error).toBe("Tenés que indicar el motivo del rechazo");
  });
});
