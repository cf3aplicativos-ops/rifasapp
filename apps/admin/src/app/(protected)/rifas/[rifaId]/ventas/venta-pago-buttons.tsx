"use client";

import { useTransition } from "react";
import { confirmarPagoVenta, anularVenta } from "../../actions";

export function VentaPagoButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => confirmarPagoVenta(id))}
        className="text-sm text-green-700 underline disabled:opacity-50 dark:text-green-400"
      >
        {isPending ? "…" : "Confirmar pago"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("¿Anular esta venta? Los boletos vuelven a estar disponibles.")) return;
          startTransition(() => anularVenta(id));
        }}
        className="text-sm text-red-600 underline disabled:opacity-50"
      >
        Anular
      </button>
    </div>
  );
}
