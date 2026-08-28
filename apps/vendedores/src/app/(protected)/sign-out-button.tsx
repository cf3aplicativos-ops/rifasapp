"use client";

import { signOut } from "next-auth/react";

// Client Component a propósito: hace una navegación dura real al final, en
// vez de depender del mecanismo de redirect interno de Next.js/Auth.js.
// Ver la nota larga en docs/ESTADO.md (Fase 3) sobre por qué.
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut({ redirect: false });
        // Hardcodeado con el basePath de esta app (Fase 13, ver
        // next.config.ts) — `window.location.href` es una navegación dura
        // real del browser, no pasa por next/navigation, así que el
        // basePath no se le aplica solo. Si se cambia el basePath, esto
        // también hay que actualizarlo a mano.
        window.location.href = "/vendedores/login";
      }}
      className="underline"
    >
      Salir
    </button>
  );
}
