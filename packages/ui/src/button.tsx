import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // text-black (no text-white, Fase 16): bg-brand-600 es amarillo #F5C518,
  // texto blanco no pasa contraste minimo sobre ese fondo.
  primary: "bg-brand-600 text-black hover:bg-brand-700 disabled:opacity-50",
  secondary:
    "border border-gray-300 text-gray-900 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900",
};

/** Botón presentacional compartido (Fase 12) — sin lógica propia, cada form
 * sigue pasando `disabled={isPending}`/`type="submit"` como ya hacía. */
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
