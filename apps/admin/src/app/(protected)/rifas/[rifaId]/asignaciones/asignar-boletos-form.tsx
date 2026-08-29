"use client";

import { useActionState, useState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { asignarBoletos } from "./actions";

type Sede = { id: string; nombre: string };
type Vendedor = { id: string; email: string; nombre: string | null };

export function AsignarBoletosForm({
  rifaId,
  sedes,
  vendedores,
}: {
  rifaId: string;
  sedes: Sede[];
  vendedores: Vendedor[];
}) {
  const [state, formAction, isPending] = useActionState(asignarBoletos, undefined);
  const [modo, setModo] = useState("CONSECUTIVO");

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="rifaId" value={rifaId} />
        <div className="space-y-1">
          <label htmlFor="target" className="text-sm font-medium">
            Asignar a
          </label>
          <select id="target" name="target" required className={formInputClassName}>
            <option value="">Elegir…</option>
            {sedes.length > 0 && (
              <optgroup label="Sedes">
                {sedes.map((sede) => (
                  <option key={sede.id} value={`sede:${sede.id}`}>
                    {sede.nombre}
                  </option>
                ))}
              </optgroup>
            )}
            {vendedores.length > 0 && (
              <optgroup label="Vendedores">
                {vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={`vendedor:${vendedor.id}`}>
                    {vendedor.nombre ?? vendedor.email}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="modo" className="text-sm font-medium">
            Modo
          </label>
          <select
            id="modo"
            name="modo"
            required
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className={formInputClassName}
          >
            <option value="CONSECUTIVO">Consecutivo</option>
            <option value="ALEATORIO">Aleatorio</option>
            <option value="ABONADOS">Abonados</option>
          </select>
        </div>
        {modo === "ABONADOS" ? (
          <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
            Le reserva a cada abonado su número preferido, si sigue libre en esta rifa.
          </p>
        ) : (
          <div className="space-y-1">
            <label htmlFor="cantidad" className="text-sm font-medium">
              Cantidad
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="1"
              placeholder="10"
              required
              className={`w-24 ${formInputClassName}`}
            />
          </div>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Asignando…" : "Asignar"}
        </Button>
        {state?.error && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="w-full text-sm text-green-700 dark:text-green-400">{state.success}</p>
        )}
      </form>
    </Card>
  );
}
