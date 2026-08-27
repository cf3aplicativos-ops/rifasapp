export type BadgeTone = "green" | "yellow" | "red" | "gray";

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

/** Pill de estado reusable (Fase 12) — reemplaza el mapa `ESTADO_STYLES` que
 * antes vivía inline en `tenants/page.tsx`. Sirve también para los estados
 * de `Rifa`/`Venta` en fases futuras, aunque esas páginas no se tocan acá. */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
