import NextAuth from "next-auth";
import { createTenantAuthConfig } from "@rifaxapp/auth";

// "/admin/login" (no "/login"): basePath de Multi Zones (Fase 13), ver la
// nota en packages/auth/src/tenant-auth-config.ts.
export const { handlers, auth, signIn, signOut } = NextAuth(
  createTenantAuthConfig("admin", "/admin/login"),
);
