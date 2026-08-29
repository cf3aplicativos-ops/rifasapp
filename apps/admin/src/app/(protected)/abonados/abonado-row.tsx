"use client";

import { useTransition } from "react";
import { eliminarAbonado } from "./actions";

export function AbonadoRow({
  id,
  nombre,
  telefono,
  numero,
}: {
  id: string;
  nombre: string;
  telefono: string;
  numero: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-900">
      <td className="px-6 py-3">{nombre}</td>
      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{telefono}</td>
      <td className="px-6 py-3 font-mono">#{numero}</td>
      <td className="px-6 py-3 text-right">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`¿Eliminar a ${nombre} de los abonados?`)) return;
            startTransition(() => eliminarAbonado(id));
          }}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
