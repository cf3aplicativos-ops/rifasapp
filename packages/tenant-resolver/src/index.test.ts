import { beforeEach, describe, expect, it, vi } from "vitest";
import { evictTenantPrismaClient, getTenantPrismaClient } from "./index.js";

const tenantFindUniqueOrThrow = vi.fn();

vi.mock("@rifaxapp/db-control", () => ({
  getControlPrismaClient: () => ({
    tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
  }),
  decryptConnectionString: vi.fn((cipherText: string) => `decrypted:${cipherText}`),
}));

const createTenantPrismaClient = vi.fn((connectionString: string) => ({
  connectionString,
  usuario: { count: vi.fn() },
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  createTenantPrismaClient: (connectionString: string) => createTenantPrismaClient(connectionString),
}));

describe("getTenantPrismaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Nota: el cache de clientes vive a nivel de módulo (a propósito, ver
  // src/index.ts), así que cada test usa un tenantId distinto para no
  // heredar el cache de un test anterior dentro del mismo archivo.

  it("crea y descifra el cliente la primera vez que se pide un tenant", async () => {
    tenantFindUniqueOrThrow.mockResolvedValue({
      id: "tenant-nuevo",
      slug: "acme",
      connectionStringCifrado: "cifrado-acme",
    });

    const client = await getTenantPrismaClient("tenant-nuevo");

    expect(tenantFindUniqueOrThrow).toHaveBeenCalledWith({ where: { id: "tenant-nuevo" } });
    expect(createTenantPrismaClient).toHaveBeenCalledWith("decrypted:cifrado-acme");
    expect(client).toMatchObject({ connectionString: "decrypted:cifrado-acme" });
  });

  it("reusa el mismo cliente cacheado en la segunda llamada, sin volver a consultar el control-plane", async () => {
    tenantFindUniqueOrThrow.mockResolvedValue({
      id: "tenant-repetido",
      slug: "acme",
      connectionStringCifrado: "cifrado-acme",
    });

    const first = await getTenantPrismaClient("tenant-repetido");
    const second = await getTenantPrismaClient("tenant-repetido");

    expect(first).toBe(second);
    expect(tenantFindUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(createTenantPrismaClient).toHaveBeenCalledTimes(1);
  });

  it("crea un cliente distinto para un tenantId distinto", async () => {
    tenantFindUniqueOrThrow.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        slug: where.id,
        connectionStringCifrado: `cifrado-${where.id}`,
      }),
    );

    const a = await getTenantPrismaClient("tenant-a");
    const b = await getTenantPrismaClient("tenant-b");

    expect(a).not.toBe(b);
    expect(createTenantPrismaClient).toHaveBeenCalledTimes(2);
  });

  it("tira un error claro si el tenant no tiene connection string todavía", async () => {
    tenantFindUniqueOrThrow.mockResolvedValue({
      id: "tenant-2",
      slug: "en-provision",
      connectionStringCifrado: null,
    });

    await expect(getTenantPrismaClient("tenant-2")).rejects.toThrow(/no tiene connection string/);
  });
});

describe("evictTenantPrismaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("desconecta y saca del cache un cliente ya creado", async () => {
    tenantFindUniqueOrThrow.mockResolvedValue({
      id: "tenant-a-desalojar",
      slug: "acme",
      connectionStringCifrado: "cifrado-acme",
    });

    const client = await getTenantPrismaClient("tenant-a-desalojar");
    await evictTenantPrismaClient("tenant-a-desalojar");

    expect(client.$disconnect).toHaveBeenCalledTimes(1);

    // Como se sacó del cache, pedirlo de nuevo crea (y descifra) uno nuevo.
    await getTenantPrismaClient("tenant-a-desalojar");
    expect(tenantFindUniqueOrThrow).toHaveBeenCalledTimes(2);
    expect(createTenantPrismaClient).toHaveBeenCalledTimes(2);
  });

  it("no hace nada si no hay ningún cliente cacheado para ese tenant", async () => {
    await expect(evictTenantPrismaClient("tenant-nunca-pedido")).resolves.toBeUndefined();
  });
});
