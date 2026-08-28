import type { ReactNode } from "react";

/** Encabezado de página (Fase 15) — reemplaza el `<h1>`/`<p>` suelto que
 * encabezaba cada página. `actions` es un slot a la derecha para un botón o
 * badge de estado cuando aplica (ej. el estado de una rifa junto al título).
 * `icon` (Fase 18, opcional): ícono de marca junto al título — cada app arma
 * su propio mapa ruta→ícono con `lucide-react` y lo pasa acá, `PageHeader`
 * no importa íconos por sí mismo (no hace falta esa dependencia en `ui`). */
export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-500"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
