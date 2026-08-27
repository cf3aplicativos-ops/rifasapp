import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ver la nota equivalente en apps/superadmin/next.config.ts: el cliente de
  // Prisma de db-tenant tiene un output propio (no @prisma/client, que Next
  // ya externaliza solo), así que Next no lo reconoce automáticamente.
  serverExternalPackages: ["@rifaxapp/db-tenant"],
  // Bug real en producción (Fase 11), ver la nota larga en
  // apps/superadmin/next.config.ts: sin esto, el motor de consultas de
  // Prisma para db-tenant no se copia al bundle serverless.
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-tenant/src/generated/client/**/*"],
  },
};

export default nextConfig;
