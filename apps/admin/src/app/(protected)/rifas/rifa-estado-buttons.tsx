"use client";

import { useTransition } from "react";
import { activarRifa, cancelarRifa } from "./actions";

export function RifaEstadoButtons({ id, estado }: { id: string; estado: string }) {
  const [isPending, startTransition] = useTransition();

  if (estado === "BORRADOR") {
    return (
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => activarRifa(id))}
          className="text-sm text-green-700 underline disabled:opacity-50 dark:text-green-400"
        >
          {isPending ? "Activando…" : "Activar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm("¿Cancelar esta rifa?")) return;
            startTransition(() => cancelarRifa(id));
          }}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (estado === "ACTIVA") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("¿Cancelar esta rifa? Los boletos vendidos quedan como están.")) return;
          startTransition(() => cancelarRifa(id));
        }}
        className="text-sm text-red-600 underline disabled:opacity-50"
      >
        Cancelar
      </button>
    );
  }

  return null;
}
