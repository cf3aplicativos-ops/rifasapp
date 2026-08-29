"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { crearRifa } from "./actions";

export function CreateRifaForm() {
  const [state, formAction, isPending] = useActionState(crearRifa, undefined);

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
            placeholder="Rifa de la moto"
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
            placeholder="Moto 0km, sorteo el 30/09"
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="precioBoleto" className="text-sm font-medium">
            Precio del boleto
          </label>
          <input
            id="precioBoleto"
            name="precioBoleto"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="10"
            required
            className={`w-28 ${formInputClassName}`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="cantidadBoletos" className="text-sm font-medium">
            Cantidad de boletos
          </label>
          <input
            id="cantidadBoletos"
            name="cantidadBoletos"
            type="number"
            min="1"
            max="2000"
            placeholder="100"
            required
            className={`w-28 ${formInputClassName}`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="formatoDigitos" className="text-sm font-medium">
            Formato de dígitos
          </label>
          <select
            id="formatoDigitos"
            name="formatoDigitos"
            defaultValue=""
            className={formInputClassName}
          >
            <option value="">Sin formato (número plano)</option>
            <option value="DOS">2 dígitos (00-99)</option>
            <option value="TRES">3 dígitos (000-999)</option>
            <option value="CUATRO">4 dígitos (0000-9999)</option>
          </select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear rifa"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
