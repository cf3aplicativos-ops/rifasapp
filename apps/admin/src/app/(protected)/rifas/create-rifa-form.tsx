"use client";

import { useActionState } from "react";
import { crearRifa } from "./actions";

export function CreateRifaForm() {
  const [state, formAction, isPending] = useActionState(crearRifa, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <div className="space-y-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          placeholder="Rifa de la moto"
          required
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="descripcion" className="text-sm font-medium">
          Descripción (opcional)
        </label>
        <input
          id="descripcion"
          name="descripcion"
          placeholder="Moto 0km, sorteo el 30/09"
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="precioBoleto" className="text-sm font-medium">
          Precio del boleto
        </label>
        <input
          id="precioBoleto"
          name="precioBoleto"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10"
          required
          className="w-28 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="cantidadBoletos" className="text-sm font-medium">
          Cantidad de boletos
        </label>
        <input
          id="cantidadBoletos"
          name="cantidadBoletos"
          type="number"
          min="1"
          max="2000"
          placeholder="100"
          required
          className="w-28 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isPending ? "Creando…" : "Crear rifa"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
