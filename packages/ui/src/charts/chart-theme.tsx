"use client";

import { useEffect, useState } from "react";

/**
 * Paleta de charts (Fase 18) — los mismos tonos semánticos que ya usa
 * `Badge` (verde/amarillo/rojo/gris para estado) para que un mismo estado
 * se vea igual en una `Badge` y en un chart. Recharts pinta con `fill`/
 * `stroke` inline (SVG), no con clases de Tailwind — por eso son valores
 * hex reales, no nombres de clase.
 */
export const CHART_COLORS = {
  brand: "#f5c518",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#9ca3af",
} as const;

export const CHART_PALETTE = [
  CHART_COLORS.brand,
  CHART_COLORS.green,
  "#3b82f6",
  "#a855f7",
  CHART_COLORS.red,
];

/**
 * El resto de la app no tiene toggle de dark mode, solo `prefers-color-
 * scheme` (Fase 12+) — así que los charts leen el mismo media feature en
 * runtime para ajustar grid/texto/tooltip, ya que esos no los puede pintar
 * Tailwind (son props de Recharts, no clases).
 */
export function useChartColorScheme() {
  // Inicializador perezoso (no un useEffect): lee el esquema actual en el
  // primer render en vez de sincronizarlo después — evita el
  // `setState` síncrono adentro de un efecto que el linter de hooks
  // rechaza (mismo criterio que el fix de `tenant-row.tsx` en Fase 17).
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return {
    isDark,
    grid: isDark ? "#27272a" : "#e5e7eb",
    text: isDark ? "#a1a1aa" : "#6b7280",
    tooltipBg: isDark ? "#18181b" : "#ffffff",
    tooltipBorder: isDark ? "#3f3f46" : "#e5e7eb",
  };
}

/**
 * Si conviene que un chart anime su entrada (`isAnimationActive` de
 * Recharts) — igual criterio que `AnimatedNumber` (ver su comentario
 * largo): la animación de entrada de Recharts también corre sobre
 * `requestAnimationFrame` por dentro (vía `react-smooth`, su dependencia de
 * animación), que los navegadores NO ejecutan en una pestaña oculta — sin
 * este chequeo, un chart montado en background se queda con la barra/área/
 * torta en su estado inicial (invisible) para siempre en vez de aparecer
 * apenas se vuelva a mostrar la pestaña. Solo se decide una vez al montar
 * (inicializador perezoso, no haría falta reaccionar a que la pestaña pase
 * a background DESPUÉS de ya haber animado).
 */
export function useChartAnimationEnabled(): boolean {
  const [enabled] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    if (document.hidden) return false;
    return true;
  });
  return enabled;
}
