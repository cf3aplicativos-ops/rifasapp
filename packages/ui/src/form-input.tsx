/** Clases Tailwind compartidas para inputs de formulario (Fase 12) — antes
 * duplicadas a mano en cada `<input>` de las 4 apps. Exportado como string,
 * no como componente: los forms existentes siguen usando `<input>` nativo
 * (los necesitan sin envolver para `FormData`/`useActionState`). */
export const formInputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900";
