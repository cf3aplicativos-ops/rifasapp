// Reglas de negocio del formato de dígitos de una rifa (Fase 19A). El
// formato de PRESENTACIÓN (padding con ceros para mostrar "007") vive en
// @rifaxapp/ui/boleto-format — este archivo es lógica de dominio pura,
// reusada por Server Actions (crearRifa/activarRifa) y sus tests.
import type { RifaFormatoDigitos } from "./generated/client";

export const CANTIDAD_MAXIMA_POR_FORMATO: Record<RifaFormatoDigitos, number> = {
  DOS: 100,
  TRES: 1000,
  CUATRO: 10000,
};

/** Número inicial de una rifa: 0 si tiene formato de dígitos (para que "00"
 * sea un boleto válido), 1 si es una rifa legacy sin formato. */
export function numeroInicialBoleto(formato: RifaFormatoDigitos | null | undefined): number {
  return formato ? 0 : 1;
}
