"use client";

import { useActionState, useRef } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { guardarFondoUrl, quitarFondo, subirFondoArchivo } from "./actions";

export function AparienciaForm({ currentUrl }: { currentUrl: string | null }) {
  const [urlState, urlFormAction, isUrlPending] = useActionState(
    guardarFondoUrl,
    undefined,
  );
  const [fileState, fileFormAction, isFilePending] = useActionState(
    subirFondoArchivo,
    undefined,
  );
  const fileFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-6">
      {currentUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Imagen actual</p>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica de origen externo o de Blob, no vale la pena el pipeline de next/image para un preview de admin */}
            <img
              src={currentUrl}
              alt="Fondo del login"
              className="h-48 w-full object-cover"
            />
          </div>
          <form action={quitarFondo}>
            <Button type="submit" variant="secondary">
              Quitar imagen
            </Button>
          </form>
        </div>
      )}

      <form
        action={urlFormAction}
        className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
      >
        <label htmlFor="backgroundUrl" className="text-sm font-medium">
          Pegar URL de la imagen
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <input
            id="backgroundUrl"
            name="backgroundUrl"
            type="url"
            placeholder="https://ejemplo.com/fondo.jpg"
            required
            className={`${formInputClassName} min-w-[16rem] flex-1`}
          />
          <Button type="submit" disabled={isUrlPending}>
            {isUrlPending ? "Guardando…" : "Guardar URL"}
          </Button>
        </div>
        {urlState && "error" in urlState && (
          <p className="text-sm text-red-600">{urlState.error}</p>
        )}
        {urlState && "success" in urlState && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Imagen guardada.
          </p>
        )}
      </form>

      <form
        ref={fileFormRef}
        action={async (formData) => {
          await fileFormAction(formData);
          fileFormRef.current?.reset();
        }}
        className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
      >
        <label htmlFor="backgroundFile" className="text-sm font-medium">
          O subir un archivo
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <input
            id="backgroundFile"
            name="backgroundFile"
            type="file"
            accept="image/*"
            required
            className={formInputClassName}
          />
          <Button type="submit" disabled={isFilePending}>
            {isFilePending ? "Subiendo…" : "Subir"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Máximo 5MB.</p>
        {fileState && "error" in fileState && (
          <p className="text-sm text-red-600">{fileState.error}</p>
        )}
        {fileState && "success" in fileState && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Imagen subida y guardada.
          </p>
        )}
      </form>
    </div>
  );
}
