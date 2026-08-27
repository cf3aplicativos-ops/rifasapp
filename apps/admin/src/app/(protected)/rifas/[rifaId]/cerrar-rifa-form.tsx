"use client";

import { useActionState } from "react";
import { cerrarRifa } from "../actions";

export function CerrarRifaForm({ rifaId }: { rifaId: string }) {
  const [state, formAction, isPending] = useActionState(cerrarRifa, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <input type="hidden" name="rifaId" value={rifaId} />
      <div className="space-y-1">
        <label htmlFor="numeroGanador" className="text-sm font-medium">
          Número de boleto ganador
        </label>
        <input
          id="numeroGanador"
          name="numeroGanador"
          type="number"
          min="1"
          required
          className="w-28 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isPending ? "Cerrando…" : "Cerrar rifa y elegir ganador"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
