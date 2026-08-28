import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/require-superadmin", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ user: { email: "admin@rifaxapp.com" } }),
}));

const tenantFindUnique = vi.fn();
const tenantCreate = vi.fn();
const tenantUpdate = vi.fn();
const tenantDelete = vi.fn();

vi.mock("@rifaxapp/db-control", () => ({
  getControlPrismaClient: () => ({
    tenant: {
      findUnique: tenantFindUnique,
      create: tenantCreate,
      update: tenantUpdate,
      delete: tenantDelete,
    },
  }),
  encryptConnectionString: vi.fn().mockReturnValue("cifrado"),
  hashPassword: vi.fn().mockResolvedValue("hash-de-la-password"),
  TenantEstado: {
    PROVISIONANDO: "PROVISIONANDO",
    ACTIVO: "ACTIVO",
    SUSPENDIDO: "SUSPENDIDO",
    ERROR: "ERROR",
  },
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  TENANT_SCHEMA_SQL: "CREATE TABLE fake;",
}));

const tenantUsuarioCount = vi.fn().mockResolvedValue(0);
const evictTenantPrismaClient = vi.fn().mockResolvedValue(undefined);

vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: vi.fn().mockResolvedValue({ usuario: { count: tenantUsuarioCount } }),
  evictTenantPrismaClient: (tenantId: string) => evictTenantPrismaClient(tenantId),
}));

const pgQuery = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => ({
  Client: vi.fn().mockImplementation(function MockClient() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      query: pgQuery,
      end: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { createTenant, deleteTenant, updateTenantNombre, toggleTenantEstado } = await import(
  "./actions"
);

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

const validFields = { slug: "mi-rifa", nombre: "Mi Rifa", adminEmail: "admin@mi-rifa.com" };

describe("createTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pgQuery.mockResolvedValue(undefined);
    tenantUsuarioCount.mockResolvedValue(0);
    process.env.TENANTS_HOST_PGHOST = "host.example.com";
    process.env.TENANTS_HOST_PGUSER = "neondb_owner";
    process.env.TENANTS_HOST_PGPASSWORD = "secret";
  });

  it("rechaza un slug con mayúsculas o caracteres inválidos", async () => {
    const result = await createTenant(undefined, formDataFrom({ ...validFields, slug: "Mi Rifa!" }));
    expect(result?.error).toMatch(/slug/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío", async () => {
    const result = await createTenant(undefined, formDataFrom({ ...validFields, nombre: "  " }));
    expect(result?.error).toMatch(/nombre/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("rechaza un email de admin inválido", async () => {
    const result = await createTenant(undefined, formDataFrom({ ...validFields, adminEmail: "no-es-un-email" }));
    expect(result?.error).toMatch(/email/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("rechaza un slug duplicado sin intentar provisionar", async () => {
    tenantFindUnique.mockResolvedValue({ id: "existing", slug: "mi-rifa" });

    const result = await createTenant(undefined, formDataFrom(validFields));

    expect(result?.error).toMatch(/ya existe/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("crea el tenant, aplica el schema, crea el TENANT_ADMIN y queda ACTIVO", async () => {
    tenantFindUnique.mockResolvedValue(null);
    tenantCreate.mockResolvedValue({ id: "new-id", slug: "mi-rifa" });

    const result = await createTenant(undefined, formDataFrom(validFields));

    expect(result?.error).toBeUndefined();
    expect(result?.success).toEqual({
      adminEmail: "admin@mi-rifa.com",
      adminPassword: expect.any(String),
    });

    expect(tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "new-id" },
        data: expect.objectContaining({ estado: "ACTIVO", connectionStringCifrado: "cifrado" }),
      }),
    );

    // Aplicó el schema plantilla contra la DB del tenant.
    expect(pgQuery).toHaveBeenCalledWith("CREATE TABLE fake;");
    // Insertó el primer TENANT_ADMIN con el email indicado.
    expect(pgQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "Usuario"'),
      expect.arrayContaining([expect.any(String), "admin@mi-rifa.com", "hash-de-la-password"]),
    );
    // Verificó el tenant de punta a punta vía tenant-resolver.
    expect(tenantUsuarioCount).toHaveBeenCalled();
  });

  it("deja el tenant en ERROR si falla la aplicación del schema", async () => {
    tenantFindUnique.mockResolvedValue(null);
    tenantCreate.mockResolvedValue({ id: "new-id", slug: "mi-rifa" });
    pgQuery.mockImplementation((sql: string) => {
      if (sql === "CREATE TABLE fake;") {
        return Promise.reject(new Error("boom"));
      }
      return Promise.resolve(undefined);
    });

    const result = await createTenant(undefined, formDataFrom(validFields));

    expect(result?.error).toMatch(/no se pudo provisionar/i);
    expect(tenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "new-id" }, data: { estado: "ERROR" } }),
    );
  });
});

describe("deleteTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("desaloja el cliente cacheado antes de borrar la DB, y borra la fila cuando el slug coincide", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", slug: "mi-rifa" });

    const result = await deleteTenant("tenant-1", "mi-rifa");

    expect(result).toBeUndefined();
    expect(evictTenantPrismaClient).toHaveBeenCalledWith("tenant-1");
    expect(pgQuery).toHaveBeenCalledWith(expect.stringContaining("DROP DATABASE"));
    expect(tenantDelete).toHaveBeenCalledWith({ where: { id: "tenant-1" } });
  });

  it("no borra nada si el slug tipeado no coincide (defensa en profundidad)", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", slug: "mi-rifa" });

    const result = await deleteTenant("tenant-1", "otro-slug");

    expect(result?.error).toMatch(/no coincide/i);
    expect(evictTenantPrismaClient).not.toHaveBeenCalled();
    expect(tenantDelete).not.toHaveBeenCalled();
  });

  it("no hace nada si el tenant no existe", async () => {
    tenantFindUnique.mockResolvedValue(null);

    await deleteTenant("no-existe", "cualquier-slug");

    expect(evictTenantPrismaClient).not.toHaveBeenCalled();
    expect(tenantDelete).not.toHaveBeenCalled();
  });
});

describe("updateTenantNombre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza un nombre vacío sin tocar la DB", async () => {
    const result = await updateTenantNombre(undefined, formDataFrom({ id: "tenant-1", nombre: "  " }));

    expect(result && "error" in result ? result.error : undefined).toMatch(/nombre/i);
    expect(tenantUpdate).not.toHaveBeenCalled();
  });

  it("informa si el tenant ya no existe", async () => {
    tenantFindUnique.mockResolvedValue(null);

    const result = await updateTenantNombre(
      undefined,
      formDataFrom({ id: "no-existe", nombre: "Nuevo nombre" }),
    );

    expect(result && "error" in result ? result.error : undefined).toMatch(/no existe/i);
    expect(tenantUpdate).not.toHaveBeenCalled();
  });

  it("actualiza el nombre cuando el tenant existe", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", slug: "mi-rifa" });

    const result = await updateTenantNombre(
      undefined,
      formDataFrom({ id: "tenant-1", nombre: "Nuevo nombre" }),
    );

    expect(result).toEqual({ success: true });
    expect(tenantUpdate).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { nombre: "Nuevo nombre" },
    });
  });
});

describe("toggleTenantEstado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pasa de ACTIVO a SUSPENDIDO", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", estado: "ACTIVO" });

    await toggleTenantEstado("tenant-1");

    expect(tenantUpdate).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { estado: "SUSPENDIDO" },
    });
  });

  it("pasa de SUSPENDIDO a ACTIVO", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", estado: "SUSPENDIDO" });

    await toggleTenantEstado("tenant-1");

    expect(tenantUpdate).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { estado: "ACTIVO" },
    });
  });

  it("no alterna un tenant PROVISIONANDO o ERROR", async () => {
    tenantFindUnique.mockResolvedValue({ id: "tenant-1", estado: "PROVISIONANDO" });

    await toggleTenantEstado("tenant-1");

    expect(tenantUpdate).not.toHaveBeenCalled();
  });
});
