"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Fase 13 (Multi Zones): ver la nota larga en apps/admin/src/app/providers.tsx
 * — `signIn()`/`signOut()` de "next-auth/react" no heredan el `basePath`
 * de Next.js solos, hace falta indicárselo acá.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/vendedores/api/auth">{children}</SessionProvider>;
}
