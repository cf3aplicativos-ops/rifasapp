"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Fase 13 (Multi Zones): `signIn()`/`signOut()` de "next-auth/react" son
 * client-side y arman su propia URL de fetch ("/api/auth/signout", etc.)
 * SIN heredar el `basePath` de Next.js — a diferencia de `redirect()` de
 * next/navigation. Confirmado en la práctica con un e2e real: sin esto,
 * `signOut()` posteaba a "/api/auth/signout" (404, ruta real es
 * "/admin/api/auth/signout"), la respuesta no era JSON válido, y la
 * excepción sin capturar cortaba el resto del handler del botón "Salir"
 * (nunca llegaba a `window.location.href`). `<SessionProvider basePath>`
 * es la forma soportada por next-auth de indicarle el prefijo correcto.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/admin/api/auth">{children}</SessionProvider>;
}
