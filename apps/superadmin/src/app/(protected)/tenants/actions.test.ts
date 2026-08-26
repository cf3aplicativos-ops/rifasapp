import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/require-superadmin", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ user: { email: "admin@rifaxapp.com" } }),
}));

const tenantFindUnique = vi.fn();
const tenantCreate = vi.fn();
const tenantUpdate = vi.fn();

vi.mock("@rifaxapp/db-control", () => ({
  getControlPrismaClient: () => ({
    tenant: {
      findUnique: tenantFindUnique,
      create: tenantCreate,
      update: tenantUpdate,
    },
  }),
  encryptConnectionString: vi.fn().mockReturnValue("cifrado"),
  TenantEstado: { PROVISIONANDO: "PROVISIONANDO", ACTIVO: "ACTIVO", ERROR: "ERROR" },
}));

vi.mock("pg", () => ({
  Client: vi.fn().mockImplementation(function MockClient() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue(undefined),
      end: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { createTenant } = await import("./actions");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TENANTS_HOST_PGHOST = "host.example.com";
    process.env.TENANTS_HOST_PGUSER = "neondb_owner";
    process.env.TENANTS_HOST_PGPASSWORD = "secret";
  });

  it("rechaza un slug con mayúsculas o caracteres inválidos", async () => {
    const result = await createTenant(undefined, formDataFrom({ slug: "Mi Rifa!", nombre: "Mi Rifa" }));
    expect(result?.error).toMatch(/slug/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío", async () => {
    const result = await createTenant(undefined, formDataFrom({ slug: "mi-rifa", nombre: "  " }));
    expect(result?.error).toMatch(/nombre/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("rechaza un slug duplicado sin intentar provisionar", async () => {
    tenantFindUnique.mockResolvedValue({ id: "existing", slug: "mi-rifa" });

    const result = await createTenant(undefined, formDataFrom({ slug: "mi-rifa", nombre: "Mi Rifa" }));

    expect(result?.error).toMatch(/ya existe/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("crea el tenant y queda ACTIVO cuando el provisioning funciona", async () => {
    tenantFindUnique.mockResolvedValue(null);
    tenantCreate.mockResolvedValue({ id: "new-id", slug: "mi-rifa" });

    const result = await createTenant(undefined, formDataFrom({ slug: "mi-rifa", nombre: "Mi Rifa" }));

    expect(result).toBeUndefined();
    expect(tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "new-id" },
        data: expect.objectContaining({ estado: "ACTIVO", connectionStringCifrado: "cifrado" }),
      }),
    );
  });
});
