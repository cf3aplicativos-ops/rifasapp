"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { guardarDominio } from "./actions";

export function ConfiguracionForm({ baseDomain }: { baseDomain: string | null }) {
  const [state, formAction, isPending] = useActionState(guardarDominio, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <div className="space-y-1">
        <label htmlFor="baseDomain" className="text-sm font-medium">
          Dominio base
        </label>
        <input
          id="baseDomain"
          name="baseDomain"
          placeholder="rifaxapp.com"
          defaultValue={baseDomain ?? ""}
          required
          className={formInputClassName}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
      {state && "error" in state && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && (
        <p className="w-full text-sm text-green-700 dark:text-green-400">
          Dominio guardado. Las instrucciones de abajo ya lo usan.
        </p>
      )}
    </form>
  );
}
