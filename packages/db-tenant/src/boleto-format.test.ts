import { describe, expect, it } from "vitest";
import { CANTIDAD_MAXIMA_POR_FORMATO, numeroInicialBoleto } from "./boleto-format";

describe("numeroInicialBoleto", () => {
  it("devuelve 1 para una rifa sin formato (legacy)", () => {
    expect(numeroInicialBoleto(null)).toBe(1);
    expect(numeroInicialBoleto(undefined)).toBe(1);
  });

  it("devuelve 0 para una rifa con formato de dígitos", () => {
    expect(numeroInicialBoleto("DOS")).toBe(0);
    expect(numeroInicialBoleto("TRES")).toBe(0);
    expect(numeroInicialBoleto("CUATRO")).toBe(0);
  });
});

describe("CANTIDAD_MAXIMA_POR_FORMATO", () => {
  it("define el rango correcto por formato", () => {
    expect(CANTIDAD_MAXIMA_POR_FORMATO.DOS).toBe(100);
    expect(CANTIDAD_MAXIMA_POR_FORMATO.TRES).toBe(1000);
    expect(CANTIDAD_MAXIMA_POR_FORMATO.CUATRO).toBe(10000);
  });
});
