import { describe, expect, it } from "vitest";
import {
  agruparBoletosPorEstado,
  bucketVentasPorDia,
  calcularDeltaSemanal,
  rankearVendedores,
} from "./dashboard-metrics";

const HOY = new Date("2026-08-28T15:00:00.000Z");

function venta(diasAtras: number, monto: number, vendedorLabel = "Vendedor A") {
  const d = new Date(HOY);
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return { createdAt: d, monto, vendedorLabel };
}

describe("bucketVentasPorDia", () => {
  it("array vacío da una serie zero-filled del largo pedido", () => {
    const serie = bucketVentasPorDia([], 5, HOY);
    expect(serie).toHaveLength(5);
    expect(serie.every((p) => p.valor === 0)).toBe(true);
    expect(serie.at(-1)!.fecha).toBe("08-28");
  });

  it("suma varias ventas del mismo día en un solo punto", () => {
    const serie = bucketVentasPorDia([venta(0, 100), venta(0, 50)], 3, HOY);
    expect(serie.at(-1)).toEqual({ fecha: "08-28", valor: 150 });
  });

  it("cruce de mes queda en buckets distintos y correctos", () => {
    const finDeAgosto = new Date("2026-08-31T12:00:00.000Z");
    const serie = bucketVentasPorDia(
      [
        {
          createdAt: new Date("2026-08-31T10:00:00.000Z"),
          monto: 10,
          vendedorLabel: "A",
        },
        {
          createdAt: new Date("2026-09-01T10:00:00.000Z"),
          monto: 20,
          vendedorLabel: "A",
        },
      ],
      2,
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(serie).toEqual([
      { fecha: "08-31", valor: 10 },
      { fecha: "09-01", valor: 20 },
    ]);
    // el `hoy` de referencia no afecta cómo se bucketea cada venta individual
    expect(finDeAgosto.getUTCMonth()).toBe(7);
  });
});

describe("calcularDeltaSemanal", () => {
  it("sin ventas en ninguna de las 2 semanas, delta 0", () => {
    expect(calcularDeltaSemanal([], HOY)).toBe(0);
  });

  it("hay ventas esta semana pero la anterior estuvo en 0 -> 100%", () => {
    const delta = calcularDeltaSemanal([venta(1, 500)], HOY);
    expect(delta).toBe(100);
  });

  it("compara semana actual vs la anterior correctamente", () => {
    const ventas = [
      venta(1, 200), // esta semana
      venta(10, 100), // semana anterior
    ];
    const delta = calcularDeltaSemanal(ventas, HOY);
    expect(delta).toBe(100); // (200-100)/100 * 100
  });

  it("caída se refleja como delta negativo", () => {
    const ventas = [venta(1, 50), venta(10, 200)];
    const delta = calcularDeltaSemanal(ventas, HOY);
    expect(delta).toBe(-75);
  });
});

describe("rankearVendedores", () => {
  it("array vacío da lista vacía", () => {
    expect(rankearVendedores([])).toEqual([]);
  });

  it("un solo vendedor con varias ventas suma correctamente", () => {
    const ranking = rankearVendedores([
      venta(0, 100, "Ana"),
      venta(1, 50, "Ana"),
    ]);
    expect(ranking).toEqual([{ label: "Ana", value: 150 }]);
  });

  it("ordena de mayor a menor y recorta al top-N", () => {
    const ventas = [
      venta(0, 300, "Ana"),
      venta(0, 900, "Beto"),
      venta(0, 100, "Caro"),
    ];
    const ranking = rankearVendedores(ventas, 2);
    expect(ranking).toEqual([
      { label: "Beto", value: 900 },
      { label: "Ana", value: 300 },
    ]);
  });

  it("un empate mantiene el orden de entrada (sort estable)", () => {
    const ventas = [venta(0, 100, "Ana"), venta(0, 100, "Beto")];
    const ranking = rankearVendedores(ventas);
    expect(ranking.map((r) => r.label)).toEqual(["Ana", "Beto"]);
  });
});

describe("agruparBoletosPorEstado", () => {
  it("rellena con 0 los estados que Prisma no devolvió", () => {
    const result = agruparBoletosPorEstado([{ estado: "VENDIDO", count: 5 }]);
    expect(result).toEqual([
      { estado: "DISPONIBLE", count: 0 },
      { estado: "RESERVADO", count: 0 },
      { estado: "VENDIDO", count: 5 },
    ]);
  });

  it("array vacío da los 3 estados en 0", () => {
    const result = agruparBoletosPorEstado([]);
    expect(result.every((r) => r.count === 0)).toBe(true);
    expect(result).toHaveLength(3);
  });
});
