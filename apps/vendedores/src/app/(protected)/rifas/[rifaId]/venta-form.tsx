"use client";

import { useActionState, useState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { registrarVenta } from "../actions";

type BoletoInfo = { id: string; numero: number; estado: string };

export function VentaForm({
  rifaId,
  boletos,
}: {
  rifaId: string;
  boletos: BoletoInfo[];
}) {
  const [state, formAction, isPending] = useActionState(
    registrarVenta,
    undefined,
  );
  const [seleccionados, setSeleccionados] = useState<number[]>([]);

  // "Ajustar estado cuando cambia una prop" (react.dev) en vez de un
  // useEffect: al pasar de pendiente a resuelto sin error, limpiar la
  // selección — se hace durante el render (guardado el valor previo de
  // isPending), no como efecto, para evitar el re-render en cascada que
  // marca `react-hooks/set-state-in-effect`.
  const [prevPending, setPrevPending] = useState(isPending);
  if (isPending !== prevPending) {
    setPrevPending(isPending);
    if (prevPending && !isPending && !state?.error) {
      setSeleccionados([]);
    }
  }

  function toggle(numero: number, estado: string) {
    if (estado !== "DISPONIBLE") return;
    setSeleccionados((prev) =>
      prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero],
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
        Seleccionados:{" "}
        {seleccionados.length > 0
          ? seleccionados
              .slice()
              .sort((a, b) => a - b)
              .join(", ")
          : "ninguno"}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="compradorNombre" className="text-sm font-medium">
            Nombre del comprador
          </label>
          <input
            id="compradorNombre"
            name="compradorNombre"
            required
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="compradorTelefono" className="text-sm font-medium">
            Teléfono (opcional)
          </label>
          <input
            id="compradorTelefono"
            name="compradorTelefono"
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="metodoPago" className="text-sm font-medium">
            Método de pago
          </label>
          <select
            id="metodoPago"
            name="metodoPago"
            required
            defaultValue="EFECTIVO"
            className={formInputClassName}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <Button
          type="submit"
          disabled={isPending || seleccionados.length === 0}
        >
          {isPending ? "Registrando…" : "Registrar venta"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
