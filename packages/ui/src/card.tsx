import type { ElementType, HTMLAttributes } from "react";

/** Contenedor simple (Fase 15) — envuelve tablas, formularios y tarjetas de
 * lista que antes eran `rounded border` sueltos. Mismo token `--radius-card`
 * que ya usa `AuthShell` desde Fase 12. `as` (default "div") permite un tag
 * semánticamente distinto — ej. `<section>` para bloques temáticos repetidos
 * (un `Card` por rifa en reportes), que es lo que el e2e de esa página
 * espera encontrar. */
export function Card({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 ${className ?? ""}`}
      {...props}
    />
  );
}
