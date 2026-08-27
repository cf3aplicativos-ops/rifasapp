import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractSlugFromHost, resolveTenantFromHost } from "./resolve-tenant-from-host";

const tenantFindUnique = vi.fn();

vi.mock("@rifaxapp/db-control", () => ({
  getControlPrismaClient: () => ({ tenant: { findUnique: tenantFindUnique } }),
  TenantEstado: { PROVISIONANDO: "PROVISIONANDO", ACTIVO: "ACTIVO", ERROR: "ERROR" },
}));

describe("extractSlugFromHost", () => {
  it("extrae el slug en dev, contra el dominio base por defecto (localhost)", () => {
    expect(extractSlugFromHost("acme.localhost:3001")).toBe("acme");
  });

  it("devuelve null para el dominio base solo, sin subdominio (dev)", () => {
    expect(extractSlugFromHost("localhost:3001")).toBeNull();
  });

  it("extrae el slug contra un dominio base explícito (caso de producción)", () => {
    expect(extractSlugFromHost("acme.rifaxapp.com", "rifaxapp.com")).toBe("acme");
  });

  it("no confunde el dominio base solo (2 labels) con un subdominio de tenant", () => {
    // "rifaxapp.com" también tiene 2 labels que "acme.rifaxapp.com" — no
    // alcanza con contar puntos, hay que compararlo contra el base domain.
    expect(extractSlugFromHost("rifaxapp.com", "rifaxapp.com")).toBeNull();
  });

  it("devuelve null para un host que no pertenece al dominio base en absoluto", () => {
    expect(extractSlugFromHost("otra-cosa.com", "rifaxapp.com")).toBeNull();
  });

  it("devuelve null para un host vacío", () => {
    expect(extractSlugFromHost("")).toBeNull();
  });
});

describe("resolveTenantFromHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el tenant si existe y está ACTIVO", async () => {
    tenantFindUnique.mockResolvedValue({ id: "t1", slug: "acme", estado: "ACTIVO" });

    const result = await resolveTenantFromHost("acme.localhost:3001");

    expect(tenantFindUnique).toHaveBeenCalledWith({ where: { slug: "acme" } });
    expect(result).toEqual({ id: "t1", slug: "acme" });
  });

  it("devuelve null si el tenant no existe", async () => {
    tenantFindUnique.mockResolvedValue(null);
    expect(await resolveTenantFromHost("no-existe.localhost:3001")).toBeNull();
  });

  it("devuelve null si el tenant existe pero no está ACTIVO", async () => {
    tenantFindUnique.mockResolvedValue({ id: "t2", slug: "en-provision", estado: "PROVISIONANDO" });
    expect(await resolveTenantFromHost("en-provision.localhost:3001")).toBeNull();
  });

  it("devuelve null sin consultar la DB si el host no tiene subdominio", async () => {
    expect(await resolveTenantFromHost("localhost:3001")).toBeNull();
    expect(tenantFindUnique).not.toHaveBeenCalled();
  });
});
