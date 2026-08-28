import type { ReactNode } from "react";
import { AnimatedNumber } from "./animated-number";
import type { NumberFormatKind } from "./number-format";

/** Grupo de métricas (Fase 15) — reemplaza los `<dl>` de texto plano que
 * mostraban conteos/montos (rifa detalle, reportes, dashboards). */
export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{children}</dl>;
}

/**
 * `icon`/`trend`/`animate` son opcionales (Fase 18, retrocompatible — todo
 * caller de antes de esta fase sigue andando igual con solo `label`+
 * `value`). `trend.deltaPct` positivo pinta una píldora verde con flecha
 * arriba, negativo roja con flecha abajo — mismo lenguaje visual que
 * `Badge`, sin reusar `Badge` en sí (esa pastilla es más chica y con ícono,
 * no vale la pena generalizar `Badge` para un solo caso de uso).
 * `animate`: si `value` es un número, lo anima con `AnimatedNumber` — si es
 * un string (ej. ya viene formateado con "$"), se muestra directo, ya que
 * `AnimatedNumber` solo sabe animar números puros. `numberFormat` es un
 * identificador (`"money"`/`"count"`, ver `number-format.ts`), NO una
 * función — `Stat` puede llamarse desde un Server Component, que no puede
 * pasarle una función arbitraria a `AnimatedNumber` (Client Component).
 */
export function Stat({
  label,
  value,
  icon,
  trend,
  animate = false,
  numberFormat,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { deltaPct: number };
  animate?: boolean;
  numberFormat?: NumberFormatKind;
}) {
  const renderedValue =
    animate && typeof value === "number" ? (
      <AnimatedNumber value={value} formatKind={numberFormat} />
    ) : (
      value
    );

  return (
    <div className="rounded-[var(--radius-card)] border border-gray-200 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </dt>
        {icon && (
          <span
            className="text-brand-600 dark:text-brand-500"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <dd className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {renderedValue}
        </dd>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.deltaPct >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {trend.deltaPct >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(trend.deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
