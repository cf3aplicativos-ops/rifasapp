"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { crearPremio } from "./actions";

export function CreatePremioForm({ rifaId }: { rifaId: string }) {
  const [state, formAction, isPending] = useActionState(crearPremio, undefined);

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="rifaId" value={rifaId} />
        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm font-medium">
            Premio
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="Televisor 55&quot;"
            required
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="descripcion" className="text-sm font-medium">
            Descripción (opcional)
          </label>
          <input
            id="descripcion"
            name="descripcion"
            placeholder="Se entrega al comprar el número"
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="numero" className="text-sm font-medium">
            Número de boleto
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
          {isPending ? "Creando…" : "Crear premio"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
