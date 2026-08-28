"use client";

import { signOut } from "next-auth/react";

// Client Component a propósito: hace una navegación dura real al final, en
// vez de depender del mecanismo de redirect interno de Next.js/Auth.js.
//
// Ojo: NO se le pasa `redirectTo` a `signOut` — se comprobó en la práctica
// que la URL de redirect que arma Auth.js del lado del servidor (para el
// endpoint /api/auth/signout) pierde el subdominio del tenant (redirige a
// "http://localhost:3001/login" en vez de "http://acme.localhost:3001/login"),
// el mismo tipo de problema de detección de Host que ya se vio en
// packages/auth/src/tenant-auth-config.ts. En vez de confiar en esa URL,
// se usa `redirect: false` y se hace `window.location` acá mismo con una
// ruta relativa — el navegador la resuelve sola contra el origen actual.
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
        window.location.href = "/admin/login";
      }}
      className="underline"
    >
      Salir
    </button>
  );
}
