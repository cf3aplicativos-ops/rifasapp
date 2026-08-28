"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { createUsuario } from "./actions";

export function CreateUsuarioForm({
  sedes,
}: {
  sedes: { id: string; nombre: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    createUsuario,
    undefined,
  );

  return (
    <div className="space-y-3">
      <Card>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vendedor@mi-rifa.com"
              required
              className={formInputClassName}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rol" className="text-sm font-medium">
              Rol
            </label>
            <select id="rol" name="rol" required className={formInputClassName}>
              <option value="SEDE_ADMIN">SEDE_ADMIN</option>
              <option value="VENDEDOR">VENDEDOR</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="sedeId" className="text-sm font-medium">
              Sede
            </label>
            <select
              id="sedeId"
              name="sedeId"
              required
              className={formInputClassName}
            >
              <option value="">— elegir —</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Invitando…" : "Invitar usuario"}
          </Button>
          {state?.error && (
            <p className="w-full text-sm text-red-600">{state.error}</p>
          )}
        </form>
      </Card>

      {state?.success && (
        <div className="rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">
            Usuario creado. Credenciales (solo se muestran esta vez):
          </p>
          <p className="mt-1 font-mono text-green-900 dark:text-green-200">
            Email: {state.success.email}
          </p>
          <p className="font-mono text-green-900 dark:text-green-200">
            Password: {state.success.password}
          </p>
        </div>
      )}
    </div>
  );
}
