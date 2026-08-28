import type { ReactNode } from "react";

/** Grupo de métricas (Fase 15) — reemplaza los `<dl>` de texto plano que
 * mostraban conteos/montos (rifa detalle, reportes, dashboards). */
export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{children}</dl>;
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-gray-200 p-4 dark:border-gray-800 dark:bg-gray-900">
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{value}</dd>
    </div>
  );
}
