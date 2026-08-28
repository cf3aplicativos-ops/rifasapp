"use client";

import { useActionState, useState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { reservarBoletos, iniciarPagoWompi } from "../actions";

type BoletoInfo = { id: string; numero: number; estado: string };

export function ReservaForm({ rifaId, boletos }: { rifaId: string; boletos: BoletoInfo[] }) {
  const [state, formAction, isPending] = useActionState(reservarBoletos, undefined);
  const [wompiState, wompiFormAction, isWompiPending] = useActionState(iniciarPagoWompi, undefined);
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
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero],
    );
  }

  const hiddenInputs = (
    <>
      <input type="hidden" name="rifaId" value={rifaId} />
      {seleccionados.map((n) => (
        <input key={n} type="hidden" name="numeros" value={n} />
      ))}
    </>
  );

  return (
    <div className="space-y-4">
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

      <Card>
        <form action={wompiFormAction} className="space-y-2">
          {hiddenInputs}
          <p className="text-sm font-medium">Pagar online (tarjeta, PSE, Nequi)</p>
          <Button type="submit" disabled={isWompiPending || seleccionados.length === 0}>
            {isWompiPending ? "Redirigiendo…" : "Pagar ahora con Wompi"}
          </Button>
          {wompiState?.error && <p className="text-sm text-red-600">{wompiState.error}</p>}
        </form>
      </Card>

      <form action={formAction} className="space-y-2">
        <p className="text-sm font-medium">O reservá y pagá por tu cuenta</p>
        {hiddenInputs}
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
              className={formInputClassName}
            >
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <Button type="submit" variant="secondary" disabled={isPending || seleccionados.length === 0}>
            {isPending ? "Reservando…" : "Reservar boletos"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No hay cobro automático: tu reserva queda pendiente hasta que confirmemos el pago.
        </p>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
