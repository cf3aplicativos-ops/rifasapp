import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const usuarioFindUnique = vi.fn();
const usuarioCreate = vi.fn();
const usuarioUpdate = vi.fn();
const getTenantPrismaClient = vi.fn().mockResolvedValue({
  usuario: { findUnique: usuarioFindUnique, create: usuarioCreate, update: usuarioUpdate },
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

const { createUsuario, actualizarComisionVendedor } = await import("./actions.js");

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
        comisionPct: null,
      },
    });
  });

  it("ignora un comisionPct enviado para un SEDE_ADMIN (solo aplica a VENDEDOR)", async () => {
    await createUsuario(undefined, formDataFrom({ ...validFields, comisionPct: "15" }));
    expect(usuarioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ comisionPct: null }),
    });
  });

  it("VENDEDOR: guarda el comisionPct si viene un valor válido", async () => {
    await createUsuario(
      undefined,
      formDataFrom({ email: "v@mi-rifa.com", rol: "VENDEDOR", sedeId: "sede-1", comisionPct: "12.5" }),
    );
    expect(usuarioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ comisionPct: 12.5 }),
    });
  });

  it("VENDEDOR: rechaza un comisionPct fuera de 0-100", async () => {
    const result = await createUsuario(
      undefined,
      formDataFrom({ email: "v@mi-rifa.com", rol: "VENDEDOR", sedeId: "sede-1", comisionPct: "150" }),
    );
    expect(result?.error).toMatch(/comisión/i);
    expect(usuarioCreate).not.toHaveBeenCalled();
  });
});

describe("actualizarComisionVendedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { rol: "TENANT_ADMIN", tenantId: "t1" } });
  });

  function formDataFrom2(fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return formData;
  }

  it("rechaza si la sesión no es TENANT_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { rol: "VENDEDOR", tenantId: "t1" } });
    const result = await actualizarComisionVendedor(
      undefined,
      formDataFrom2({ usuarioId: "u1", comisionPct: "10" }),
    );
    expect(result?.error).toMatch(/no tiene permiso/i);
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it("rechaza un valor fuera de 0-100", async () => {
    const result = await actualizarComisionVendedor(
      undefined,
      formDataFrom2({ usuarioId: "u1", comisionPct: "-5" }),
    );
    expect(result?.error).toMatch(/comisión/i);
  });

  it("rechaza si el usuario no es VENDEDOR", async () => {
    usuarioFindUnique.mockResolvedValue({ id: "u1", rol: "SEDE_ADMIN" });
    const result = await actualizarComisionVendedor(
      undefined,
      formDataFrom2({ usuarioId: "u1", comisionPct: "10" }),
    );
    expect(result?.error).toMatch(/no es un vendedor/i);
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it("actualiza el comisionPct de un vendedor", async () => {
    usuarioFindUnique.mockResolvedValue({ id: "u1", rol: "VENDEDOR" });
    const result = await actualizarComisionVendedor(
      undefined,
      formDataFrom2({ usuarioId: "u1", comisionPct: "18" }),
    );
    expect(result).toBeUndefined();
    expect(usuarioUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { comisionPct: 18 } });
  });

  it("permite vaciar el comisionPct (volver a null)", async () => {
    usuarioFindUnique.mockResolvedValue({ id: "u1", rol: "VENDEDOR" });
    await actualizarComisionVendedor(undefined, formDataFrom2({ usuarioId: "u1", comisionPct: "" }));
    expect(usuarioUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { comisionPct: null } });
  });
});
