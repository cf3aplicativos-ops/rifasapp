"use client";

import { useActionState } from "react";
import { createSede } from "./actions";

export function CreateSedeForm() {
  const [state, formAction, isPending] = useActionState(createSede, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <div className="space-y-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre de la sede
        </label>
        <input
          id="nombre"
          name="nombre"
          placeholder="Sede Centro"
          required
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isPending ? "Creando…" : "Crear sede"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
