import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @prisma/client (usado por db-control) ya viene externalizado por
  // defecto por Next (ver serverExternalPackages.md). El cliente de
  // db-tenant se genera en una salida propia (packages/db-tenant/src/generated/client,
  // no el paquete @prisma/client de siempre) para no chocar con el de
  // db-control en el mismo node_modules del workspace — por eso Next no lo
  // reconoce automáticamente y hay que externalizarlo a mano, si no el
  // código de detección de entorno de Prisma (acceso dinámico a fs/path)
  // arrastra todo el proyecto al bundle serverless.
  serverExternalPackages: ["@rifaxapp/db-tenant"],
  // Bug real en producción (Fase 11): al ser "external", Next.js no traza
  // el contenido de db-tenant estáticamente — y el motor de consultas de
  // Prisma (el .so.node de rhel-openssl-3.0.x) se resuelve en runtime con
  // acceso a fs dinámico, así que el trace automático de Vercel no lo
  // detecta y no lo copia al bundle de la función serverless. Sin esto,
  // cualquier ruta que use getTenantPrismaClient revienta con
  // "could not locate the Query Engine for runtime rhel-openssl-3.0.x".
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-tenant/src/generated/client/**/*"],
  },
};

export default nextConfig;
