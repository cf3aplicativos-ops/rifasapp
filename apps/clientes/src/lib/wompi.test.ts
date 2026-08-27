import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { buildWompiCheckoutUrl, verifyWompiEventChecksum } from "./wompi";

const ORIGINAL_ENV = { ...process.env };

describe("buildWompiCheckoutUrl", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.WOMPI_PUBLIC_KEY = "pub_test_abc123";
    process.env.WOMPI_INTEGRITY_SECRET = "test_integrity_secret";
  });

  it("tira si faltan las env vars", () => {
    delete process.env.WOMPI_PUBLIC_KEY;
    expect(() =>
      buildWompiCheckoutUrl({ reference: "t1--v1", amountInCents: 1000, redirectUrl: "https://x.com" }),
    ).toThrow(/WOMPI_PUBLIC_KEY/);
  });

  it("arma la URL con la firma de integridad calculada independientemente", () => {
    const url = buildWompiCheckoutUrl({
      reference: "t1--v1",
      amountInCents: 1000000,
      redirectUrl: "https://tenant.example.com/mis-boletos",
    });

    // Calculado acá con node:crypto directo (no reusando la implementación)
    // para detectar bugs reales de orden/concatenación en buildWompiCheckoutUrl.
    const expectedIntegrity = createHash("sha256")
      .update("t1--v1" + "1000000" + "COP" + "test_integrity_secret")
      .digest("hex");

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://checkout.wompi.co/p/");
    expect(parsed.searchParams.get("public-key")).toBe("pub_test_abc123");
    expect(parsed.searchParams.get("currency")).toBe("COP");
    expect(parsed.searchParams.get("amount-in-cents")).toBe("1000000");
    expect(parsed.searchParams.get("reference")).toBe("t1--v1");
    expect(parsed.searchParams.get("redirect-url")).toBe("https://tenant.example.com/mis-boletos");
    expect(parsed.searchParams.get("signature:integrity")).toBe(expectedIntegrity);
  });
});

describe("verifyWompiEventChecksum", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.WOMPI_EVENTS_SECRET = "test_events_secret";
  });

  function payloadWithChecksum(overrides: { transactionId?: string; status?: string; timestamp?: number } = {}) {
    const transactionId = overrides.transactionId ?? "01-123-456";
    const status = overrides.status ?? "APPROVED";
    const timestamp = overrides.timestamp ?? 1530291411;

    // Checksum calculado independientemente (no reusando verifyWompiEventChecksum).
    const checksum = createHash("sha256")
      .update(transactionId + status + timestamp + "test_events_secret")
      .digest("hex");

    return {
      event: "transaction.updated",
      data: { transaction: { id: transactionId, status } },
      signature: { properties: ["transaction.id", "transaction.status"], checksum },
      timestamp,
    };
  }

  it("acepta un checksum válido", () => {
    const payload = payloadWithChecksum();
    expect(verifyWompiEventChecksum(payload)).toBe(true);
  });

  it("acepta un checksum en mayúsculas (case-insensitive)", () => {
    const payload = payloadWithChecksum();
    payload.signature.checksum = payload.signature.checksum.toUpperCase();
    expect(verifyWompiEventChecksum(payload)).toBe(true);
  });

  it("rechaza si el checksum no matchea", () => {
    const payload = payloadWithChecksum();
    payload.signature.checksum = "0".repeat(64);
    expect(verifyWompiEventChecksum(payload)).toBe(false);
  });

  it("rechaza si algún valor de las propiedades cambió (payload alterado)", () => {
    const payload = payloadWithChecksum();
    payload.data.transaction.status = "DECLINED";
    expect(verifyWompiEventChecksum(payload)).toBe(false);
  });

  it("rechaza si falta el secret", () => {
    delete process.env.WOMPI_EVENTS_SECRET;
    const payload = payloadWithChecksum();
    expect(verifyWompiEventChecksum(payload)).toBe(false);
  });

  it("rechaza si falta signature.properties", () => {
    const payload = payloadWithChecksum();
    // @ts-expect-error - simulando payload malformado
    delete payload.signature.properties;
    expect(verifyWompiEventChecksum(payload)).toBe(false);
  });
});
