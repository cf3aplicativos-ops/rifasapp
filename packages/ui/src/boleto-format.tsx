// Formato de PRESENTACIÓN de un número de boleto (Fase 19A). El `numero`
// en la base de datos siempre es un Int puro — el padding es solo visual,
// nunca cambia el dato. La validación de rango y el número inicial de una
// rifa (lógica de negocio) viven en @rifaxapp/db-tenant/boleto-format, no
// acá — este paquete es de UI, no depende de db-tenant.
// Nota de extensión: este archivo no tiene JSX, pero el export map de este
// paquete resuelve "./*" solo contra ".tsx" (ver package.json) — igual que
// number-format.tsx, tiene que ser .tsx para poder importarse por subpath.
export type BoletoFormatoDigitos = "DOS" | "TRES" | "CUATRO";

const ANCHO_POR_FORMATO: Record<BoletoFormatoDigitos, number> = {
  DOS: 2,
  TRES: 3,
  CUATRO: 4,
};

/** "7" -> "007" si formato = TRES; sin formato, devuelve el número plano. */
export function formatNumeroBoleto(
  numero: number,
  formato: BoletoFormatoDigitos | null | undefined,
): string {
  if (!formato) return String(numero);
  return String(numero).padStart(ANCHO_POR_FORMATO[formato], "0");
}
