import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ver la nota equivalente en apps/superadmin/next.config.ts: el cliente de
  // Prisma de db-tenant tiene un output propio (no @prisma/client, que Next
  // ya externaliza solo), así que Next no lo reconoce automáticamente.
  serverExternalPackages: ["@rifaxapp/db-tenant"],
};

export default nextConfig;
