import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fase 12: ver la nota equivalente en apps/superadmin/next.config.ts —
  // el indicador de Next.js Dev Tools tapaba el botón de logout del sidebar.
  devIndicators: { position: "bottom-right" },
  // Ver la nota equivalente en apps/superadmin/next.config.ts: el cliente de
  // Prisma de db-tenant tiene un output propio (no @prisma/client, que Next
  // ya externaliza solo), así que Next no lo reconoce automáticamente.
  serverExternalPackages: ["@rifaxapp/db-tenant"],
  // Bug real en producción (Fase 11), ver la nota larga en
  // apps/superadmin/next.config.ts: sin `outputFileTracingRoot` apuntando
  // al monorepo, packages/db-tenant queda afuera de la raíz de trace por
  // default y `outputFileTracingIncludes` solo no alcanza a copiar el
  // motor de consultas de Prisma al bundle serverless.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-tenant/src/generated/client/**/*"],
  },
  // Fase 13 — Multi Zones (ver la nota larga en apps/clientes/next.config.ts):
  // `admin` es una zona no-raíz, sirve todas sus páginas bajo `/admin` — con
  // `basePath` alcanza (prefija rutas Y assets automáticamente, no hace
  // falta un `assetPrefix` aparte). Aplica también en dev local y accediendo
  // directo por el propio deploy de Vercel, no solo detrás del proxy de
  // `clientes`.
  basePath: "/admin",
  // Requerido por Multi Zones: al llegar vía `{tenant}.rifax.lat/admin/...`
  // el `Origin` de cada Server Action no coincide con el host propio del
  // deploy de esta app — sin esto, Next.js rechaza TODAS las Server Actions
  // (login, crear sede, invitar usuario, etc.) como un posible CSRF.
  experimental: {
    serverActions: { allowedOrigins: ["rifax.lat", "*.rifax.lat"] },
  },
};

export default nextConfig;
