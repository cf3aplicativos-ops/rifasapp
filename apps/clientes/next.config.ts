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
  // Fase 13 — Multi Zones (diseñado en docs/ARQUITECTURA.md desde Fase 0,
  // implementado recién ahora que existe un dominio real): `clientes` es la
  // zona raíz de cada tenant (`{tenant}.rifax.lat/`) y reenvía `/admin/**` y
  // `/vendedores/**` a los deployments de esas apps, que sirven sus propias
  // páginas bajo ese mismo prefijo vía `basePath` (ver sus next.config.ts).
  // `ADMIN_ZONE_URL`/`VENDEDORES_ZONE_URL`: en dev apuntan a los otros dev
  // servers (localhost:3001/3002); en producción, a los alias fijos
  // rifaxapp-admin.vercel.app/rifaxapp-vendedores.vercel.app.
  async rewrites() {
    return [
      { source: "/admin", destination: `${process.env.ADMIN_ZONE_URL}/admin` },
      { source: "/admin/:path*", destination: `${process.env.ADMIN_ZONE_URL}/admin/:path*` },
      { source: "/vendedores", destination: `${process.env.VENDEDORES_ZONE_URL}/vendedores` },
      {
        source: "/vendedores/:path*",
        destination: `${process.env.VENDEDORES_ZONE_URL}/vendedores/:path*`,
      },
    ];
  },
};

export default nextConfig;
