import type { ElementType, HTMLAttributes } from "react";

/** Contenedor simple (Fase 15) — envuelve tablas, formularios y tarjetas de
 * lista que antes eran `rounded border` sueltos. Mismo token `--radius-card`
 * que ya usa `AuthShell` desde Fase 12. `as` (default "div") permite un tag
 * semánticamente distinto — ej. `<section>` para bloques temáticos repetidos
 * (un `Card` por rifa en reportes), que es lo que el e2e de esa página
 * espera encontrar.
 *
 * `interactive` (Fase 18, opt-in): hover-lift + sombra + transición, para
 * tarjetas de listado clickeables/navegables (rifas, mis-boletos) — no es
 * el default porque una `Card` que envuelve un form o una tabla no debería
 * "levantarse" al pasar el mouse, solo las que representan un ítem. */
export function Card({
  as: Tag = "div",
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType; interactive?: boolean }) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 ${
        interactive
          ? "transition-all duration-300 ease-[var(--ease-standard)] hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg dark:hover:border-brand-800"
          : ""
      } ${className ?? ""}`}
      {...props}
    />
  );
}
