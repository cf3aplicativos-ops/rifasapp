"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { deleteTenant, toggleTenantEstado, updateTenantNombre } from "./actions";

const ESTADO_TONE: Record<string, BadgeTone> = {
  ACTIVO: "green",
  PROVISIONANDO: "yellow",
  SUSPENDIDO: "gray",
  ERROR: "red",
};

type Tenant = {
  id: string;
  slug: string;
  nombre: string;
  estado: string;
  createdAt: Date;
};

/**
 * Fila completa de la tabla de tenants (Fase 17), Client Component a
 * propósito — maneja 3 piezas de estado local propias de una sola fila
 * (modo edición del nombre, el pending de desactivar/reactivar, y el
 * diálogo de borrado) que no tiene sentido subir a `page.tsx` (Server
 * Component, no puede tener ninguno de los tres).
 */
export function TenantRow({ tenant }: { tenant: Tenant }) {
  const [editing, setEditing] = useState(false);
  const [nombreState, nombreAction, isNombrePending] = useActionState(
    updateTenantNombre,
    undefined,
  );
  const [isEstadoPending, startEstadoTransition] = useTransition();

  // Cierra el modo edición apenas la Server Action confirma éxito — ajuste
  // de estado durante el render (patrón documentado de React, no un
  // `useEffect`: el linter de hooks rechaza un `setState` síncrono adentro
  // de un efecto) comparando contra la referencia anterior de `nombreState`
  // para que solo dispare una vez por resultado nuevo, no en cada render
  // mientras `editing` esté en `true`.
  const [lastHandledNombreState, setLastHandledNombreState] = useState(nombreState);
  if (nombreState !== lastHandledNombreState) {
    setLastHandledNombreState(nombreState);
    if (nombreState && "success" in nombreState) {
      setEditing(false);
    }
  }

  const puedeAlternarEstado = tenant.estado === "ACTIVO" || tenant.estado === "SUSPENDIDO";

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-900">
      <td className="px-6 py-3 font-mono">{tenant.slug}</td>
      <td className="px-6 py-3">
        {editing ? (
          <form action={nombreAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={tenant.id} />
            <input
              name="nombre"
              defaultValue={tenant.nombre}
              required
              autoFocus
              className={`${formInputClassName} py-1`}
            />
            <Button type="submit" disabled={isNombrePending} className="px-2 py-1 text-xs">
              {isNombrePending ? "Guardando…" : "Guardar"}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 underline"
            >
              Cancelar
            </button>
            {nombreState && "error" in nombreState && (
              <span className="text-xs text-red-600">{nombreState.error}</span>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left underline decoration-dotted underline-offset-2"
            title="Editar nombre"
          >
            {tenant.nombre}
          </button>
        )}
      </td>
      <td className="px-6 py-3">
        <Badge tone={ESTADO_TONE[tenant.estado] ?? "gray"}>{tenant.estado}</Badge>
      </td>
      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
        {tenant.createdAt.toLocaleDateString("es")}
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center justify-end gap-3">
          {puedeAlternarEstado && (
            <button
              type="button"
              disabled={isEstadoPending}
              onClick={() => {
                if (
                  tenant.estado === "ACTIVO" &&
                  !confirm(
                    `¿Desactivar "${tenant.nombre}"? Sus usuarios no van a poder entrar hasta que lo reactivés.`,
                  )
                ) {
                  return;
                }
                startEstadoTransition(() => {
                  toggleTenantEstado(tenant.id);
                });
              }}
              className="text-sm text-gray-600 underline disabled:opacity-50 dark:text-gray-400"
            >
              {isEstadoPending
                ? "…"
                : tenant.estado === "ACTIVO"
                  ? "Desactivar"
                  : "Reactivar"}
            </button>
          )}
          <DeleteTenantDialog tenant={tenant} />
        </div>
      </td>
    </tr>
  );
}

function DeleteTenantDialog({ tenant }: { tenant: Tenant }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [ack, setAck] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const puedeBorrar = ack && typedSlug === tenant.slug;

  function cerrar() {
    dialogRef.current?.close();
    setAck(false);
    setTypedSlug("");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-sm text-red-600 underline"
      >
        Borrar
      </button>
      {/* <dialog> nativo (Fase 17): backdrop, Escape para cerrar y foco
          atrapado adentro vienen gratis del navegador, no hace falta
          armar un modal a mano para esto. */}
      <dialog
        ref={dialogRef}
        onCancel={cerrar}
        className="w-full max-w-md rounded-[var(--radius-card)] border border-gray-200 bg-white p-6 text-sm backdrop:bg-black/50 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Borrar tenant &quot;{tenant.nombre}&quot;
        </h2>
        <p className="mt-2 text-red-700 dark:text-red-400">
          Esta acción es <strong>irreversible</strong>: se borra el tenant y su base de datos
          completa (rifas, ventas, sedes, usuarios — todo).
        </p>

        <label className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5"
          />
          <span>Entiendo que esta acción no se puede deshacer.</span>
        </label>

        <div className="mt-3 space-y-1">
          <label htmlFor="confirmSlug" className="text-xs font-medium">
            Escribí <span className="font-mono">{tenant.slug}</span> para confirmar
          </label>
          <input
            id="confirmSlug"
            value={typedSlug}
            onChange={(e) => setTypedSlug(e.target.value)}
            className={`${formInputClassName} py-1 font-mono`}
            autoComplete="off"
          />
        </div>

        {error && <p className="mt-2 text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={cerrar} className="text-gray-600 underline dark:text-gray-400">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeBorrar || isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteTenant(tenant.id, typedSlug);
                if (result && "error" in result) {
                  setError(result.error);
                  return;
                }
                cerrar();
              });
            }}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {isPending ? "Borrando…" : "Borrar definitivamente"}
          </button>
        </div>
      </dialog>
    </>
  );
}
