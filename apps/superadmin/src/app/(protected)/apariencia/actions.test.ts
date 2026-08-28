import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdmin = vi.fn().mockResolvedValue({ user: { email: "admin@rifaxapp.com" } });
vi.mock("@/lib/require-superadmin", () => ({
  requireSuperAdmin: () => requireSuperAdmin(),
}));

const setLoginBackgroundUrl = vi.fn().mockResolvedValue({ id: "config-1", loginBackgroundUrl: null });
vi.mock("@rifaxapp/db-control", () => ({
  setLoginBackgroundUrl: (url: string | null) => setLoginBackgroundUrl(url),
}));

const put = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => put(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { guardarFondoUrl, subirFondoArchivo, quitarFondo } = await import("./actions");

function urlFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("guardarFondoUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLoginBackgroundUrl.mockResolvedValue({ id: "config-1", loginBackgroundUrl: "https://x.com/a.jpg" });
  });

  it("exige sesión de superadmin", async () => {
    await guardarFondoUrl(undefined, urlFormData({ backgroundUrl: "https://x.com/a.jpg" }));
    expect(requireSuperAdmin).toHaveBeenCalled();
  });

  it("rechaza una URL vacía", async () => {
    const result = await guardarFondoUrl(undefined, urlFormData({ backgroundUrl: "" }));
    expect(result && "error" in result ? result.error : undefined).toMatch(/URL/i);
    expect(setLoginBackgroundUrl).not.toHaveBeenCalled();
  });

  it("rechaza un valor que no es una URL http(s)", async () => {
    const result = await guardarFondoUrl(undefined, urlFormData({ backgroundUrl: "javascript:alert(1)" }));
    expect(result && "error" in result ? result.error : undefined).toMatch(/URL/i);
    expect(setLoginBackgroundUrl).not.toHaveBeenCalled();
  });

  it("guarda una URL http(s) válida", async () => {
    const result = await guardarFondoUrl(undefined, urlFormData({ backgroundUrl: "https://x.com/a.jpg" }));
    expect(setLoginBackgroundUrl).toHaveBeenCalledWith("https://x.com/a.jpg");
    expect(result).toEqual({ success: true });
  });
});

describe("subirFondoArchivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLoginBackgroundUrl.mockResolvedValue({ id: "config-1", loginBackgroundUrl: "https://blob.vercel-storage.com/a.jpg" });
    put.mockResolvedValue({ url: "https://blob.vercel-storage.com/a.jpg" });
  });

  it("exige sesión de superadmin", async () => {
    const formData = new FormData();
    formData.set("backgroundFile", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    await subirFondoArchivo(undefined, formData);
    expect(requireSuperAdmin).toHaveBeenCalled();
  });

  it("rechaza si no hay archivo", async () => {
    const formData = new FormData();
    const result = await subirFondoArchivo(undefined, formData);
    expect(result && "error" in result ? result.error : undefined).toMatch(/imagen/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que no es imagen", async () => {
    const formData = new FormData();
    formData.set("backgroundFile", new File(["x"], "a.txt", { type: "text/plain" }));
    const result = await subirFondoArchivo(undefined, formData);
    expect(result && "error" in result ? result.error : undefined).toMatch(/imagen/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza un archivo de más de 5MB", async () => {
    const formData = new FormData();
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.jpg", { type: "image/jpeg" });
    formData.set("backgroundFile", big);
    const result = await subirFondoArchivo(undefined, formData);
    expect(result && "error" in result ? result.error : undefined).toMatch(/5MB/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("sube un archivo válido y guarda la URL resultante", async () => {
    const formData = new FormData();
    formData.set("backgroundFile", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    const result = await subirFondoArchivo(undefined, formData);
    expect(put).toHaveBeenCalled();
    expect(setLoginBackgroundUrl).toHaveBeenCalledWith("https://blob.vercel-storage.com/a.jpg");
    expect(result).toEqual({ success: true });
  });
});

describe("quitarFondo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige sesión de superadmin y limpia el campo", async () => {
    await quitarFondo();
    expect(requireSuperAdmin).toHaveBeenCalled();
    expect(setLoginBackgroundUrl).toHaveBeenCalledWith(null);
  });
});
