"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { createTenant } from "./actions";

export function CreateTenantForm() {
  const [state, formAction, isPending] = useActionState(createTenant, undefined);

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
      >
        {/* min-w (no flex-1 suelto): sin un ancho mínimo, `formInputClassName`
            (w-full, ver Fase 16 — antes estos 3 inputs tenían un className
            crudo sin `w-full`, que hacía que label e input quedaran en la
            misma línea, pegados, en vez de apilados) encoge cada campo a
            practicamente 0 dentro de un `flex-wrap` con 3+ hermanos. */}
        <div className="min-w-[10rem] flex-1 space-y-1">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="mi-rifa"
            required
            className={formInputClassName}
          />
        </div>
        <div className="min-w-[10rem] flex-1 space-y-1">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="Mi Rifa S.A."
            required
            className={formInputClassName}
          />
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label htmlFor="adminEmail" className="text-sm font-medium">
            Email del admin
          </label>
          <input
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@mi-rifa.com"
            required
            className={formInputClassName}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear tenant"}
        </Button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>

      {state?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">
            Tenant creado. Credenciales del admin (solo se muestran esta vez):
          </p>
          <p className="mt-1 font-mono text-green-900 dark:text-green-200">
            Email: {state.success.adminEmail}
          </p>
          <p className="font-mono text-green-900 dark:text-green-200">
            Password: {state.success.adminPassword}
          </p>
        </div>
      )}
    </div>
  );
}
