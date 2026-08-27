"use client";

import { useActionState } from "react";
import { createUsuario } from "./actions";

export function CreateUsuarioForm({ sedes }: { sedes: { id: string; nombre: string }[] }) {
  const [state, formAction, isPending] = useActionState(createUsuario, undefined);

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
      >
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
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="rol" className="text-sm font-medium">
            Rol
          </label>
          <select
            id="rol"
            name="rol"
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
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
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">— elegir —</option>
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {isPending ? "Invitando…" : "Invitar usuario"}
        </button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>

      {state?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">
            Usuario creado. Credenciales (solo se muestran esta vez):
          </p>
          <p className="mt-1 font-mono text-green-900 dark:text-green-200">Email: {state.success.email}</p>
          <p className="font-mono text-green-900 dark:text-green-200">Password: {state.success.password}</p>
        </div>
      )}
    </div>
  );
}
