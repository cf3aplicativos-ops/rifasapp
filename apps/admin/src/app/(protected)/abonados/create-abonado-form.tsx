"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { crearAbonado } from "./actions";

export function CreateAbonadoForm() {
  const [state, formAction, isPending] = useActionState(crearAbonado, undefined);

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="María Pérez"
            required
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="telefono" className="text-sm font-medium">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            placeholder="3001234567"
            required
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="numero" className="text-sm font-medium">
            Número preferido
          </label>
          <input
            id="numero"
            name="numero"
            type="number"
            min="0"
            placeholder="7"
            required
            className={`w-28 ${formInputClassName}`}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Agregar abonado"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
