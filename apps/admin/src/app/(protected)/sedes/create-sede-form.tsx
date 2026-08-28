"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { createSede } from "./actions";

export function CreateSedeForm() {
  const [state, formAction, isPending] = useActionState(createSede, undefined);

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre de la sede
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="Sede Centro"
            required
            className={formInputClassName}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear sede"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
