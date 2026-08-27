"use client";

import { useActionState, useEffect, useState } from "react";
import { reservarBoletos } from "../actions";

type BoletoInfo = { id: string; numero: number; estado: string };

export function ReservaForm({ rifaId, boletos }: { rifaId: string; boletos: BoletoInfo[] }) {
  const [state, formAction, isPending] = useActionState(reservarBoletos, undefined);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (wasPending && !isPending && !state?.error) {
      setSeleccionados([]);
    }
    setWasPending(isPending);
  }, [isPending, state, wasPending]);

  function toggle(numero: number, estado: string) {
    if (estado !== "DISPONIBLE") return;
    setSeleccionados((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero],
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="rifaId" value={rifaId} />
      {seleccionados.map((n) => (
        <input key={n} type="hidden" name="numeros" value={n} />
      ))}

      <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
        {boletos.map((b) => {
          const isSelected = seleccionados.includes(b.numero);
          return (
            <button
              type="button"
              key={b.id}
              disabled={b.estado !== "DISPONIBLE"}
              onClick={() => toggle(b.numero, b.estado)}
              title={`Boleto #${b.numero} — ${b.estado}`}
              className={
                "rounded border px-1 py-1 text-xs " +
                (isSelected
                  ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                  : b.estado === "DISPONIBLE"
                    ? "border-gray-300 dark:border-gray-700"
                    : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900")
              }
            >
              {b.numero}
            </button>
          );
        })}
      </div>

      <p className="text-sm">
        Seleccionados: {seleccionados.length > 0 ? seleccionados.slice().sort((a, b) => a - b).join(", ") : "ninguno"}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="metodoPago" className="text-sm font-medium">
            Cómo vas a pagar
          </label>
          <select
            id="metodoPago"
            name="metodoPago"
            required
            defaultValue="TRANSFERENCIA"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending || seleccionados.length === 0}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {isPending ? "Reservando…" : "Reservar boletos"}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        No hay cobro automático: tu reserva queda pendiente hasta que confirmemos el pago.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
