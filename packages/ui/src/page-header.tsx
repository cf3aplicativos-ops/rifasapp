import type { ReactNode } from "react";

/** Encabezado de página (Fase 15) — reemplaza el `<h1>`/`<p>` suelto que
 * encabezaba cada página. `actions` es un slot a la derecha para un botón o
 * badge de estado cuando aplica (ej. el estado de una rifa junto al título). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
