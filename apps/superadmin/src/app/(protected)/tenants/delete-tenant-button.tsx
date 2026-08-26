"use client";

import { useTransition } from "react";
import { deleteTenant } from "./actions";

export function DeleteTenantButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("¿Borrar este tenant y su base de datos? Esta acción no se puede deshacer.")) {
          return;
        }
        startTransition(() => {
          deleteTenant(id);
        });
      }}
      className="text-sm text-red-600 underline disabled:opacity-50"
    >
      {isPending ? "Borrando…" : "Borrar"}
    </button>
  );
}
