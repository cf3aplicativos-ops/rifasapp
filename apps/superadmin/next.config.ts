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
};

export default nextConfig;
