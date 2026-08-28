"use client";

import { useEffect, useState } from "react";

/**
 * Barra de progreso presentacional (Fase 18) — usada en "rifas activas" del
 * dashboard de admin y en el detalle de una rifa (boletos vendidos/total).
 * `pct` en 0-100, se clampea. Arranca en 0 y anima con `transition-[width]`
 * al valor real apenas monta — mismo efecto visual que `AnimatedNumber` pero
 * para una barra en vez de un número.
 */
export function ProgressBar({
  pct,
  label,
  tone = "brand",
}: {
  pct: number;
  label?: string;
  tone?: "brand" | "green";
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const barColor = tone === "green" ? "bg-green-500" : "bg-brand-600";

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-700 ease-[var(--ease-standard)]`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
