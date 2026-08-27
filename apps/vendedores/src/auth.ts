import NextAuth from "next-auth";
import { createTenantAuthConfig } from "@rifaxapp/auth";

export const { handlers, auth, signIn, signOut } = NextAuth(createTenantAuthConfig("vendedores"));
