"use client";

import { useActionState, useState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { actualizarComisionVendedor } from "./actions";

type Usuario = {
  id: string;
  email: string;
  rol: string;
  sedeNombre: string | null;
  comisionPct: number | null;
};

export function UsuarioRow({ usuario }: { usuario: Usuario }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    actualizarComisionVendedor,
    undefined,
  );

  // Mismo patrón que TenantRow (Fase 17): comparar el estado anterior de la
  // Server Action durante el render (no un useEffect) para cerrar el modo
  // edición apenas confirma éxito.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (!state?.error) {
      setEditing(false);
    }
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-900">
      <td className="px-6 py-3 font-mono">{usuario.email}</td>
      <td className="px-6 py-3">{usuario.rol}</td>
      <td className="px-6 py-3">{usuario.sedeNombre ?? "—"}</td>
      <td className="px-6 py-3">
        {usuario.rol !== "VENDEDOR" ? (
          "—"
        ) : editing ? (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <input
              name="comisionPct"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={usuario.comisionPct ?? ""}
              autoFocus
              className={`${formInputClassName} w-20 py-1`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
            <Button
              type="submit"
              disabled={isPending}
              className="px-2 py-1 text-xs"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 underline"
            >
              Cancelar
            </button>
            {state?.error && (
              <span className="text-xs text-red-600">{state.error}</span>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="underline decoration-dotted underline-offset-2"
            title="Editar comisión"
          >
            {usuario.comisionPct != null ? `${usuario.comisionPct}%` : "Configurar"}
          </button>
        )}
      </td>
    </tr>
  );
}
