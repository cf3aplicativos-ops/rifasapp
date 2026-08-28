import { describe, expect, it } from "vitest";
import { bucketTenantsPorMes, contarTenantsPorEstado } from "./tenant-metrics";

describe("contarTenantsPorEstado", () => {
  it("array vacío da todos los estados en 0", () => {
    const result = contarTenantsPorEstado([]);
    expect(result).toEqual({
      PROVISIONANDO: 0,
      ACTIVO: 0,
      SUSPENDIDO: 0,
      ERROR: 0,
    });
  });

  it("cuenta cada estado correctamente", () => {
    const tenants = [
      { estado: "ACTIVO", createdAt: new Date() },
      { estado: "ACTIVO", createdAt: new Date() },
      { estado: "SUSPENDIDO", createdAt: new Date() },
    ];
    const result = contarTenantsPorEstado(tenants);
    expect(result.ACTIVO).toBe(2);
    expect(result.SUSPENDIDO).toBe(1);
    expect(result.PROVISIONANDO).toBe(0);
    expect(result.ERROR).toBe(0);
  });
});

describe("bucketTenantsPorMes", () => {
  const HOY = new Date("2026-08-28T15:00:00.000Z");

  it("array vacío da la serie zero-filled del largo pedido", () => {
    const serie = bucketTenantsPorMes([], 3, HOY);
    expect(serie).toHaveLength(3);
    expect(serie.every((p) => p.value === 0)).toBe(true);
    expect(serie.map((p) => p.label)).toEqual(["jun", "jul", "ago"]);
  });

  it("agrupa tenants del mismo mes en un solo punto", () => {
    const tenants = [
      { estado: "ACTIVO", createdAt: new Date("2026-08-05T00:00:00.000Z") },
      { estado: "ACTIVO", createdAt: new Date("2026-08-20T00:00:00.000Z") },
    ];
    const serie = bucketTenantsPorMes(tenants, 2, HOY);
    expect(serie).toEqual([
      { label: "jul", value: 0 },
      { label: "ago", value: 2 },
    ]);
  });

  it("cruce de año queda en el mes correcto", () => {
    const hoy = new Date("2026-01-15T00:00:00.000Z");
    const tenants = [
      { estado: "ACTIVO", createdAt: new Date("2025-12-20T00:00:00.000Z") },
    ];
    const serie = bucketTenantsPorMes(tenants, 2, hoy);
    expect(serie).toEqual([
      { label: "dic", value: 1 },
      { label: "ene", value: 0 },
    ]);
  });
});
