import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
