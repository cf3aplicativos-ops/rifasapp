import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantFromHostMock = vi.fn();
const getTenantPrismaClientMock = vi.fn();
vi.mock("@rifaxapp/tenant-resolver", () => ({
  resolveTenantFromHost: (host: string) => resolveTenantFromHostMock(host),
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClientMock(tenantId),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Map([["host", "acme.localhost:3003"]]),
}));

vi.mock("@rifaxapp/db-control", () => ({
  hashPassword: vi.fn().mockResolvedValue("hash-de-la-password"),
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  UsuarioRol: { TENANT_ADMIN: "TENANT_ADMIN", SEDE_ADMIN: "SEDE_ADMIN", VENDEDOR: "VENDEDOR", CLIENTE: "CLIENTE" },
}));

const signInMock = vi.fn();
vi.mock("@/auth", () => ({ signIn: (...args: unknown[]) => signInMock(...args) }));

// Evita cargar el paquete real "next-auth" (que a su vez importa "next/server"
// de una forma que Vitest no resuelve bien fuera de un entorno Next real) —
// solo hace falta la clase AuthError para el `catch` de la action.
class MockAuthError extends Error {}
vi.mock("next-auth", () => ({ AuthError: MockAuthError }));

const { registerAction } = await import("./actions");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const usuarioFindUnique = vi.fn();
const usuarioCreate = vi.fn();

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTenantFromHostMock.mockResolvedValue({ id: "t1", slug: "acme" });
    getTenantPrismaClientMock.mockResolvedValue({
      usuario: { findUnique: usuarioFindUnique, create: usuarioCreate },
    });
    usuarioFindUnique.mockResolvedValue(null);
    signInMock.mockResolvedValue(undefined);
  });

  it("rechaza un email inválido", async () => {
    const result = await registerAction(
      undefined,
      formDataFrom({ email: "no-es-email", password: "password123" }),
    );
    expect(result?.error).toMatch(/email/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña muy corta", async () => {
    const result = await registerAction(
      undefined,
      formDataFrom({ email: "cliente@example.com", password: "corta" }),
    );
    expect(result?.error).toMatch(/contraseña/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza un email ya registrado", async () => {
    usuarioFindUnique.mockResolvedValue({ id: "existing" });

    const result = await registerAction(
      undefined,
      formDataFrom({ email: "cliente@example.com", password: "password123" }),
    );

    expect(result?.error).toMatch(/ya existe/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("crea el usuario CLIENTE (sedeId null) e inicia sesión", async () => {
    const result = await registerAction(
      undefined,
      formDataFrom({ email: "cliente@example.com", password: "password123" }),
    );

    expect(result).toBeUndefined();
    expect(usuarioCreate).toHaveBeenCalledWith({
      data: {
        email: "cliente@example.com",
        passwordHash: "hash-de-la-password",
        rol: "CLIENTE",
        sedeId: null,
      },
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "cliente@example.com",
      password: "password123",
      tenantId: "t1",
      redirectTo: "/dashboard",
    });
  });
});
