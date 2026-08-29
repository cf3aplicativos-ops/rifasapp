"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { crearRifa } from "./actions";

const CANTIDAD_POR_FORMATO: Record<string, number> = {
  DOS: 100,
  TRES: 1000,
  CUATRO: 10000,
};

type PremioFila = { id: number; nombre: string; numero: string };

export function CreateRifaForm() {
  const [state, formAction, isPending] = useActionState(crearRifa, undefined);
  const [formato, setFormato] = useState("");
  const [premios, setPremios] = useState<PremioFila[]>([]);
  const [nextId, setNextId] = useState(1);

  const cantidadCalculada = formato ? CANTIDAD_POR_FORMATO[formato] : null;

  function agregarPremio() {
    setPremios((prev) => [...prev, { id: nextId, nombre: "", numero: "" }]);
    setNextId((n) => n + 1);
  }

  function quitarPremio(id: number) {
    setPremios((prev) => prev.filter((p) => p.id !== id));
  }

  function actualizarPremio(id: number, campo: "nombre" | "numero", valor: string) {
    setPremios((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="nombre" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              placeholder="Rifa de la moto"
              required
              className={formInputClassName}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="descripcion" className="text-sm font-medium">
              Descripción (opcional)
            </label>
            <input
              id="descripcion"
              name="descripcion"
              placeholder="Moto 0km, sorteo el 30/09"
              className={formInputClassName}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="precioBoleto" className="text-sm font-medium">
              Precio del boleto
            </label>
            <input
              id="precioBoleto"
              name="precioBoleto"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="10"
              required
              className={`w-28 ${formInputClassName}`}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="formatoDigitos" className="text-sm font-medium">
              Formato de dígitos
            </label>
            <select
              id="formatoDigitos"
              name="formatoDigitos"
              defaultValue=""
              onChange={(e) => setFormato(e.target.value)}
              className={formInputClassName}
            >
              <option value="">Sin formato (número plano)</option>
              <option value="DOS">2 dígitos (00-99)</option>
              <option value="TRES">3 dígitos (000-999)</option>
              <option value="CUATRO">4 dígitos (0000-9999)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="cantidadBoletos" className="text-sm font-medium">
              Cantidad de boletos
            </label>
            {cantidadCalculada ? (
              // Con formato, la cantidad es siempre el rango completo — de
              // solo lectura acá, el servidor la recalcula igual (nunca
              // confía en este valor, ver crearRifa).
              <input
                id="cantidadBoletos"
                name="cantidadBoletos"
                value={cantidadCalculada}
                readOnly
                title="Se calcula solo según el formato elegido"
                className={`w-28 cursor-not-allowed bg-gray-100 dark:bg-gray-900 ${formInputClassName}`}
              />
            ) : (
              <input
                id="cantidadBoletos"
                name="cantidadBoletos"
                type="number"
                min="1"
                max="2000"
                placeholder="100"
                required
                className={`w-28 ${formInputClassName}`}
              />
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Premios anticipados (opcional)</p>
            <button
              type="button"
              onClick={agregarPremio}
              className="flex items-center gap-1 text-sm text-brand-700 underline dark:text-brand-500"
            >
              <Plus className="h-4 w-4" /> Agregar premio
            </button>
          </div>
          {premios.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Se entregan antes del sorteo principal, atados a un número puntual — se pueden
              agregar más después desde la rifa.
            </p>
          ) : (
            <div className="space-y-2">
              {premios.map((premio) => (
                <div key={premio.id} className="flex flex-wrap items-end gap-2">
                  <input
                    name="premioNombre"
                    placeholder="Televisor 55&quot;"
                    value={premio.nombre}
                    onChange={(e) => actualizarPremio(premio.id, "nombre", e.target.value)}
                    className={formInputClassName}
                  />
                  <input
                    name="premioNumero"
                    type="number"
                    min="0"
                    placeholder="Número"
                    value={premio.numero}
                    onChange={(e) => actualizarPremio(premio.id, "numero", e.target.value)}
                    className={`w-28 ${formInputClassName}`}
                  />
                  <button
                    type="button"
                    onClick={() => quitarPremio(premio.id)}
                    className="text-red-600"
                    title="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando…" : "Crear rifa"}
          </Button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        </div>
      </form>
    </Card>
  );
}
