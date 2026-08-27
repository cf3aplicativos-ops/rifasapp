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
        window.location.href = "/login";
      }}
      className="underline"
    >
      Salir
    </button>
  );
}
