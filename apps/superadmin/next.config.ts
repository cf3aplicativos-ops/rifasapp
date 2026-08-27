import path from "node:path";
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
  // Bug real en producción (Fase 11): por default Next.js solo traza
  // adentro de la carpeta de la app — packages/db-tenant queda AFUERA de
  // esa raíz, así que `outputFileTracingIncludes` por sí solo no alcanza
  // (los docs de Next.js lo dicen explícito: "any files outside of that
  // folder will not be included"). Hace falta subir la raíz del trace al
  // monorepo con `outputFileTracingRoot` para que el motor de consultas de
  // Prisma (el .so.node de rhel-openssl-3.0.x, que Prisma resuelve con
  // acceso a fs dinámico en runtime, no con un require() estático) sea
  // siquiera elegible para copiarse al bundle de la función serverless.
  // Sin esto, cualquier ruta que use getTenantPrismaClient revienta con
  // "could not locate the Query Engine for runtime rhel-openssl-3.0.x".
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../packages/db-tenant/src/generated/client/**/*"],
  },
};

export default nextConfig;
