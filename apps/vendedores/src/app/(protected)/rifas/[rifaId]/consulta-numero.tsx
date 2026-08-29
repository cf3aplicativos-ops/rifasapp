"use client";

import { useActionState } from "react";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Button } from "@rifaxapp/ui/button";
import { Card } from "@rifaxapp/ui/card";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { consultarNumeroVendedor, solicitarTraspasoVendedor } from "../actions";

const RESULTADO_LABEL: Record<string, string> = {
  NO_EXISTE: "Ese número no existe en esta rifa",
  LIBRE: "Libre — se puede vender directo",
  PROPIO: "Es tuyo — se puede vender directo",
  SEDE: "Lo tiene la sede",
  OTRO_VENDEDOR: "Lo tiene otro vendedor",
};

const RESULTADO_TONE: Record<string, BadgeTone> = {
  NO_EXISTE: "gray",
  LIBRE: "green",
  PROPIO: "green",
  SEDE: "yellow",
  OTRO_VENDEDOR: "yellow",
};

export function ConsultaNumero({ rifaId }: { rifaId: string }) {
  const [state, formAction, isPending] = useActionState(consultarNumeroVendedor, undefined);
  const [solicitudState, solicitudAction, isSolicitudPending] = useActionState(
    solicitarTraspasoVendedor,
    undefined,
  );

  const consulta = state && "resultado" in state ? state : undefined;
  const consultaError = state && "error" in state ? state.error : undefined;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        Consultar un número
      </h2>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="rifaId" value={rifaId} />
        <div className="space-y-1">
          <label htmlFor="numero-consulta" className="text-sm font-medium">
            Número
          </label>
          <input
            id="numero-consulta"
            name="numero"
            type="number"
            min="0"
            required
            className={`w-28 ${formInputClassName}`}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Buscando…" : "Buscar"}
        </Button>
        {consultaError && <p className="w-full text-sm text-red-600">{consultaError}</p>}
      </form>

      {consulta && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-900">
          <Badge tone={RESULTADO_TONE[consulta.resultado.tipo] ?? "gray"}>
            {RESULTADO_LABEL[consulta.resultado.tipo] ?? consulta.resultado.tipo}
          </Badge>
          {consulta.resultado.tipo === "SEDE" && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Sede: {consulta.resultado.sedeNombre}
            </span>
          )}
          {consulta.resultado.tipo === "OTRO_VENDEDOR" && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Vendedor: {consulta.resultado.vendedorNombre}
            </span>
          )}
          {(consulta.resultado.tipo === "SEDE" || consulta.resultado.tipo === "OTRO_VENDEDOR") && (
            <form action={solicitudAction}>
              <input type="hidden" name="rifaId" value={consulta.rifaId} />
              <input type="hidden" name="numero" value={consulta.numero} />
              <Button type="submit" disabled={isSolicitudPending} variant="secondary">
                {isSolicitudPending ? "Enviando…" : "Pedir prestado"}
              </Button>
            </form>
          )}
        </div>
      )}
      {solicitudState?.error && (
        <p className="mt-2 text-sm text-red-600">{solicitudState.error}</p>
      )}
      {solicitudState?.success && (
        <p className="mt-2 text-sm text-green-700 dark:text-green-400">{solicitudState.success}</p>
      )}
    </Card>
  );
}
