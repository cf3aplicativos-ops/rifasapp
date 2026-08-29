"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { crearLiquidacion } from "./actions";

type Vendedor = { id: string; nombre: string | null; email: string; comisionPct: number | null };

export function CreateLiquidacionForm({ vendedores }: { vendedores: Vendedor[] }) {
  const [state, formAction, isPending] = useActionState(crearLiquidacion, undefined);

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="vendedorId" className="text-sm font-medium">
            Vendedor
          </label>
          <select id="vendedorId" name="vendedorId" required className={formInputClassName}>
            <option value="">Elegir…</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {(v.nombre ?? v.email) + (v.comisionPct != null ? ` (${v.comisionPct}%)` : " (sin % configurado)")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="periodoDesde" className="text-sm font-medium">
            Desde
          </label>
          <input
            id="periodoDesde"
            name="periodoDesde"
            type="date"
            required
            className={formInputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="periodoHasta" className="text-sm font-medium">
            Hasta
          </label>
          <input
            id="periodoHasta"
            name="periodoHasta"
            type="date"
            required
            className={formInputClassName}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Liquidando…" : "Liquidar"}
        </Button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        {state?.success && (
          <p className="w-full text-sm text-green-700 dark:text-green-400">{state.success}</p>
        )}
      </form>
    </Card>
  );
}
