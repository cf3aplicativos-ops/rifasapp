"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { aceptarTraspaso, rechazarTraspaso } from "./actions";

export function TraspasoRow({
  solicitud,
}: {
  solicitud: {
    id: string;
    numeroFormateado: string;
    rifaNombre: string;
    solicitanteNombre: string;
  };
}) {
  const [isAceptarPending, startAceptarTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, isRechazarPending] = useActionState(rechazarTraspaso, undefined);

  // A diferencia de venta-form.tsx (que solo hace setState acá), esto
  // necesita tocar un ref (dialogRef.current.close()) — el lint de refs de
  // React Compiler prohíbe leer/escribir un ref durante el render, así que
  // esto sí va en un useEffect (el lugar correcto para efectos
  // imperativos), comparando contra el pending anterior guardado en un ref
  // propio para no disparar un re-render extra solo para trackearlo.
  const prevPendingRef = useRef(isRechazarPending);
  useEffect(() => {
    if (prevPendingRef.current && !isRechazarPending && !state?.error) {
      dialogRef.current?.close();
    }
    prevPendingRef.current = isRechazarPending;
  }, [isRechazarPending, state]);

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-900">
      <td className="px-6 py-3 font-mono">#{solicitud.numeroFormateado}</td>
      <td className="px-6 py-3">{solicitud.rifaNombre}</td>
      <td className="px-6 py-3">{solicitud.solicitanteNombre}</td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={isAceptarPending}
            onClick={() => startAceptarTransition(() => aceptarTraspaso(solicitud.id))}
            className="text-sm text-green-700 underline disabled:opacity-50 dark:text-green-400"
          >
            {isAceptarPending ? "Aceptando…" : "Aceptar"}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="text-sm text-red-600 underline"
          >
            Rechazar
          </button>
        </div>

        <dialog
          ref={dialogRef}
          className="w-full max-w-md rounded-[var(--radius-card)] border border-gray-200 bg-white p-6 text-left text-sm backdrop:bg-black/50 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Rechazar solicitud de #{solicitud.numeroFormateado}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {solicitud.solicitanteNombre} pidió este número — contale por qué no se lo pasás.
          </p>
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="solicitudId" value={solicitud.id} />
            <textarea
              name="motivoRechazo"
              required
              rows={3}
              placeholder="Motivo del rechazo"
              className={`${formInputClassName} resize-none`}
            />
            {state?.error && <p className="text-red-600">{state.error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="text-gray-600 underline dark:text-gray-400"
              >
                Cancelar
              </button>
              <Button type="submit" disabled={isRechazarPending}>
                {isRechazarPending ? "Rechazando…" : "Rechazar"}
              </Button>
            </div>
          </form>
        </dialog>
      </td>
    </tr>
  );
}
