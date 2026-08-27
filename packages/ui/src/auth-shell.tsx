import type { ReactNode } from "react";

/**
 * Envoltorio visual compartido por los 4 `login/page.tsx` (Fase 12). Server
 * Component a propósito — no tiene estado ni hooks, así que no necesita
 * "use client" y puede seguir viviendo directo en cada Server Component de
 * login sin agregar un límite cliente/servidor nuevo.
 *
 * `children` es el `<form>` de cada app (con su propio `action={loginAction}`
 * y sus inputs) — este componente NO sabe nada de Auth.js/Server Actions,
 * solo arma el marco (marca, título, banner de error, tarjeta).
 */
export function AuthShell({
  title,
  subtitle,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm">
            R
          </span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="rounded-[var(--radius-card)] border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
}
