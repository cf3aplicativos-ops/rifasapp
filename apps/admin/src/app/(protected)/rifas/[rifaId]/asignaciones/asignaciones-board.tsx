"use client";

import { useMemo, useState } from "react";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";

export type BoletoAsignado = {
  id: string;
  numero: number;
  estado: string;
  sedeId: string | null;
  sedeNombre: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
};

const ESTADO_CLASS: Record<string, string> = {
  DISPONIBLE: "border-gray-300 dark:border-gray-700",
  RESERVADO: "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  VENDIDO: "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900",
};

function GrillaNumeros({
  boletos,
  formato,
}: {
  boletos: { numero: number; estado: string }[];
  formato: BoletoFormatoDigitos | null;
}) {
  return (
    <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto sm:grid-cols-12">
      {boletos.map((b) => (
        <span
          key={b.numero}
          title={`#${formatNumeroBoleto(b.numero, formato)} — ${b.estado}`}
          className={`rounded border px-1 py-0.5 text-center text-[11px] ${ESTADO_CLASS[b.estado] ?? "border-gray-300"}`}
        >
          {formatNumeroBoleto(b.numero, formato)}
        </span>
      ))}
    </div>
  );
}

/**
 * Fase 19 (ajuste pedido): los boletos de la sede/oficina se muestran como
 * una grilla visual — igual criterio que la grilla de venta de vendedores,
 * pero en una tarjeta más chica (max-h-40 con scroll) porque acá es solo
 * para mirar, no para vender. Los de cada vendedor quedan atrás de un
 * buscador + desplegable en vez de listarse todos juntos — con varios
 * vendedores, una grilla de todos a la vez sería ilegible.
 */
export function AsignacionesBoard({
  asignados,
  formato,
}: {
  asignados: BoletoAsignado[];
  formato: BoletoFormatoDigitos | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [vendedorId, setVendedorId] = useState("");

  const porSede = useMemo(() => {
    const mapa = new Map<string, { nombre: string; boletos: { numero: number; estado: string }[] }>();
    for (const b of asignados) {
      if (!b.sedeId) continue;
      if (!mapa.has(b.sedeId)) mapa.set(b.sedeId, { nombre: b.sedeNombre ?? "Sede", boletos: [] });
      mapa.get(b.sedeId)!.boletos.push({ numero: b.numero, estado: b.estado });
    }
    return [...mapa.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre));
  }, [asignados]);

  const vendedoresConBoletos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; boletos: { numero: number; estado: string }[] }>();
    for (const b of asignados) {
      if (!b.vendedorId) continue;
      if (!mapa.has(b.vendedorId)) {
        mapa.set(b.vendedorId, { nombre: b.vendedorNombre ?? "Vendedor", boletos: [] });
      }
      mapa.get(b.vendedorId)!.boletos.push({ numero: b.numero, estado: b.estado });
    }
    return [...mapa.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre));
  }, [asignados]);

  const vendedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vendedoresConBoletos;
    return vendedoresConBoletos.filter(([, v]) => v.nombre.toLowerCase().includes(q));
  }, [vendedoresConBoletos, busqueda]);

  const vendedorSeleccionado = vendedoresConBoletos.find(([id]) => id === vendedorId)?.[1] ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          Boletos de la sede
        </h2>
        {porSede.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ninguna sede tiene boletos asignados todavía.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {porSede.map(([sedeId, sede]) => (
              <Card key={sedeId} className="space-y-2">
                <p className="text-sm font-medium">
                  {sede.nombre}{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    ({sede.boletos.length})
                  </span>
                </p>
                <GrillaNumeros boletos={sede.boletos} formato={formato} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          Boletos por vendedor
        </h2>
        {vendedoresConBoletos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ningún vendedor tiene boletos asignados todavía.
          </p>
        ) : (
          <Card className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="buscarVendedor" className="text-sm font-medium">
                  Buscar vendedor
                </label>
                <input
                  id="buscarVendedor"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre o email…"
                  className={formInputClassName}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="seleccionarVendedor" className="text-sm font-medium">
                  Vendedor
                </label>
                <select
                  id="seleccionarVendedor"
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  className={formInputClassName}
                >
                  <option value="">Elegir…</option>
                  {vendedoresFiltrados.map(([id, v]) => (
                    <option key={id} value={id}>
                      {v.nombre} ({v.boletos.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {vendedorSeleccionado ? (
              <GrillaNumeros boletos={vendedorSeleccionado.boletos} formato={formato} />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Elegí un vendedor para ver sus números.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
