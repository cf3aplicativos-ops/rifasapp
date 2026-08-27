import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const sedeCreate = vi.fn();
const getTenantPrismaClient = vi.fn().mockResolvedValue({ sede: { create: sedeCreate } });
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

// @rifaxapp/auth (assertRole) NO se mockea — es lógica pura sin dependencias
// externas, corre real y así el test también cubre esa lógica de verdad.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createSede } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("createSede", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });

    const result = await createSede(undefined, formDataFrom({ nombre: "Sede Centro" }));

    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(sedeCreate).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });

    const result = await createSede(undefined, formDataFrom({ nombre: "  " }));

    expect(result?.error).toMatch(/nombre/i);
    expect(sedeCreate).not.toHaveBeenCalled();
  });

  it("crea la sede cuando la sesión es TENANT_ADMIN y el nombre es válido", async () => {
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });

    const result = await createSede(undefined, formDataFrom({ nombre: "Sede Centro" }));

    expect(result).toBeUndefined();
    expect(getTenantPrismaClient).toHaveBeenCalledWith("t1");
    expect(sedeCreate).toHaveBeenCalledWith({ data: { nombre: "Sede Centro" } });
  });
});
