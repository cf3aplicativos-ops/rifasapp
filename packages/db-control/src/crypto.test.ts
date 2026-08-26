import { beforeAll, describe, expect, it } from "vitest";
import { decryptConnectionString, encryptConnectionString } from "./crypto";

beforeAll(() => {
  process.env.CONTROL_PLANE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encryptConnectionString / decryptConnectionString", () => {
  it("recupera el texto original tras un round-trip", () => {
    const original = "postgresql://user:pass@host/tenant_acme?sslmode=require";
    const cipherText = encryptConnectionString(original);
    expect(cipherText).not.toBe(original);
    expect(decryptConnectionString(cipherText)).toBe(original);
  });

  it("produce un cifrado distinto cada vez (IV aleatorio)", () => {
    const original = "postgresql://user:pass@host/tenant_acme";
    const a = encryptConnectionString(original);
    const b = encryptConnectionString(original);
    expect(a).not.toBe(b);
  });

  it("falla si el ciphertext fue alterado", () => {
    const cipherText = encryptConnectionString("postgresql://user:pass@host/db");
    const tampered = cipherText.slice(0, -4) + "aaaa";
    expect(() => decryptConnectionString(tampered)).toThrow();
  });
});
