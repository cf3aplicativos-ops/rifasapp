import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const usuarioFindUnique = vi.fn();
const usuarioCreate = vi.fn();
const getTenantPrismaClient = vi.fn().mockResolvedValue({
  usuario: { findUnique: usuarioFindUnique, create: usuarioCreate },
});
vi.mock("@rifaxapp/tenant-resolver", () => ({
  getTenantPrismaClient: (tenantId: string) => getTenantPrismaClient(tenantId),
}));

vi.mock("@rifaxapp/db-control", () => ({
  hashPassword: vi.fn().mockResolvedValue("hash-de-la-password"),
}));

vi.mock("@rifaxapp/db-tenant", () => ({
  UsuarioRol: { TENANT_ADMIN: "TENANT_ADMIN", SEDE_ADMIN: "SEDE_ADMIN", VENDEDOR: "VENDEDOR", CLIENTE: "CLIENTE" },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createUsuario } = await import("./actions.js");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const validFields = { email: "sede-admin@mi-rifa.com", rol: "SEDE_ADMIN", sedeId: "sede-1" };

describe("createUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
    usuarioFindUnique.mockResolvedValue(null);
  });

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "SEDE_ADMIN", tenantId: "t1" } });

    const result = await createUsuario(undefined, formDataFrom(validFields));

    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza un email inválido", async () => {
    const result = await createUsuario(undefined, formDataFrom({ ...validFields, email: "no-es-email" }));
    expect(result?.error).toMatch(/email/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza un rol que no sea SEDE_ADMIN o VENDEDOR", async () => {
    const result = await createUsuario(undefined, formDataFrom({ ...validFields, rol: "TENANT_ADMIN" }));
    expect(result?.error).toMatch(/rol/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza si falta la sede", async () => {
    const result = await createUsuario(undefined, formDataFrom({ ...validFields, sedeId: "" }));
    expect(result?.error).toMatch(/sede/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("rechaza un email duplicado", async () => {
    usuarioFindUnique.mockResolvedValue({ id: "existing" });

    const result = await createUsuario(undefined, formDataFrom(validFields));

    expect(result?.error).toMatch(/ya existe/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });

  it("crea el usuario y devuelve las credenciales generadas", async () => {
    const result = await createUsuario(undefined, formDataFrom(validFields));

    expect(result?.success).toEqual({
      email: "sede-admin@mi-rifa.com",
      password: expect.any(String),
    });
    expect(usuarioCreate).toHaveBeenCalledWith({
      data: {
        email: "sede-admin@mi-rifa.com",
        passwordHash: "hash-de-la-password",
        rol: "SEDE_ADMIN",
        sedeId: "sede-1",
      },
    });
  });
});
