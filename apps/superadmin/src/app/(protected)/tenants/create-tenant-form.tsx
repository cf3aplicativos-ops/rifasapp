"use client";

import { useActionState } from "react";
import { createTenant } from "./actions";

export function CreateTenantForm() {
  const [state, formAction, isPending] = useActionState(createTenant, undefined);

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
      >
        <div className="space-y-1">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="mi-rifa"
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="Mi Rifa S.A."
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="adminEmail" className="text-sm font-medium">
            Email del admin
          </label>
          <input
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@mi-rifa.com"
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {isPending ? "Creando…" : "Crear tenant"}
        </button>
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
