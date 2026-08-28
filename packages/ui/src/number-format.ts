/**
 * Formateadores de número para `Stat`/`AnimatedNumber`/charts (Fase 18) —
 * viven en un módulo compartido (no en cada `page.tsx`) a propósito: los
 * componentes que los usan son todos Client Components, y un Server
 * Component no puede pasarles una función arbitraria como prop — React
 * tira "Functions cannot be passed directly to Client Components" (visto
 * en la práctica al armar el dashboard de admin). La solución no es
 * "definir la función en otro archivo" (el problema es cruzar el límite
 * server→cliente por *props*, no dónde vive el código) — es que cada
 * `page.tsx` (Server Component) pase un identificador de texto (`"money"`/
 * `"count"`), y estos componentes elijan el formateador ACÁ ADENTRO, sin
 * que ninguna función cruce nunca ese límite. Import relativo únicamente
 * dentro de `packages/ui/src` — las apps solo pasan el string, nunca
 * importan esto directo.
 */
export type NumberFormatKind = "money" | "count";

const FORMATTERS: Record<NumberFormatKind, (n: number) => string> = {
  money: (n) => `$${n.toLocaleString("es", { maximumFractionDigits: 0 })}`,
  count: (n) => Math.round(n).toLocaleString("es"),
};

export function formatNumber(
  n: number,
  kind: NumberFormatKind = "count",
): string {
  return FORMATTERS[kind](n);
}
