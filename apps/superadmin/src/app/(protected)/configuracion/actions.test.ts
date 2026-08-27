import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdmin = vi.fn().mockResolvedValue({ user: { email: "admin@rifaxapp.com" } });
vi.mock("@/lib/require-superadmin", () => ({
  requireSuperAdmin: () => requireSuperAdmin(),
}));

const setPlatformBaseDomain = vi.fn().mockResolvedValue({ id: "config-1", baseDomain: "rifaxapp.com" });
vi.mock("@rifaxapp/db-control", () => ({
  setPlatformBaseDomain: (domain: string) => setPlatformBaseDomain(domain),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { guardarDominio } = await import("./actions");

function formDataFrom(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("guardarDominio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPlatformBaseDomain.mockResolvedValue({ id: "config-1", baseDomain: "rifaxapp.com" });
  });

  it("exige sesión de superadmin", async () => {
    await guardarDominio(undefined, formDataFrom({ baseDomain: "rifaxapp.com" }));
    expect(requireSuperAdmin).toHaveBeenCalled();
  });

  it("rechaza un dominio vacío", async () => {
    const result = await guardarDominio(undefined, formDataFrom({ baseDomain: "" }));
    expect(result && "error" in result ? result.error : undefined).toMatch(/dominio/i);
    expect(setPlatformBaseDomain).not.toHaveBeenCalled();
  });

  it("rechaza un dominio con protocolo o ruta", async () => {
    const result = await guardarDominio(
      undefined,
      formDataFrom({ baseDomain: "https://rifaxapp.com/algo" }),
    );
    expect(result && "error" in result ? result.error : undefined).toMatch(/dominio/i);
    expect(setPlatformBaseDomain).not.toHaveBeenCalled();
  });

  it("rechaza un dominio sin TLD", async () => {
    const result = await guardarDominio(undefined, formDataFrom({ baseDomain: "localhost" }));
    expect(result && "error" in result ? result.error : undefined).toMatch(/dominio/i);
    expect(setPlatformBaseDomain).not.toHaveBeenCalled();
  });

  it("guarda un dominio válido en minúsculas", async () => {
    const result = await guardarDominio(
      undefined,
      formDataFrom({ baseDomain: "RifaxApp.com" }),
    );
    expect(setPlatformBaseDomain).toHaveBeenCalledWith("rifaxapp.com");
    expect(result).toEqual({ success: true });
  });
});
