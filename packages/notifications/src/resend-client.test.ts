import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));

const { enviarEmail } = await import("./resend-client");

const ORIGINAL_ENV = { ...process.env };

describe("enviarEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("no envía nada (ni tira) si falta RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      enviarEmail({ to: "cliente@example.com", subject: "Hola", html: "<p>hola</p>" }),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("envía con el from default si no hay EMAIL_FROM configurado", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.EMAIL_FROM;
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await enviarEmail({ to: "cliente@example.com", subject: "Hola", html: "<p>hola</p>" });

    expect(send).toHaveBeenCalledWith({
      from: "Rifaxapp <onboarding@resend.dev>",
      to: "cliente@example.com",
      subject: "Hola",
      html: "<p>hola</p>",
    });
  });

  it("usa EMAIL_FROM si está configurado", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Mi Rifa <no-reply@mirifa.com>";
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await enviarEmail({ to: "cliente@example.com", subject: "Hola", html: "<p>hola</p>" });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: "Mi Rifa <no-reply@mirifa.com>" }));
  });

  it("no tira si Resend devuelve un error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    send.mockResolvedValue({ data: null, error: { message: "invalid recipient", name: "validation_error" } });

    await expect(
      enviarEmail({ to: "no-es-un-email", subject: "Hola", html: "<p>hola</p>" }),
    ).resolves.toBeUndefined();
  });
});
