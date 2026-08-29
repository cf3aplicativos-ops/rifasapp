"use client";

import { useTransition } from "react";
import { Badge } from "@rifaxapp/ui/badge";
import { eliminarPremio, marcarPremioEntregado } from "./actions";

export function PremioRow({
  id,
  numeroFormateado,
  nombre,
  descripcion,
  entregado,
}: {
  id: string;
  numeroFormateado: string;
  nombre: string;
  descripcion: string | null;
  entregado: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-900">
      <td className="px-6 py-3 font-mono">#{numeroFormateado}</td>
      <td className="px-6 py-3">{nombre}</td>
      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
        {descripcion ?? "—"}
      </td>
      <td className="px-6 py-3">
        <Badge tone={entregado ? "green" : "yellow"}>
          {entregado ? "Entregado" : "Pendiente"}
        </Badge>
      </td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-3">
          {!entregado && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => marcarPremioEntregado(id))}
              className="text-sm text-green-700 underline disabled:opacity-50 dark:text-green-400"
            >
              Marcar entregado
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`¿Eliminar el premio "${nombre}"?`)) return;
              startTransition(() => eliminarPremio(id));
            }}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
