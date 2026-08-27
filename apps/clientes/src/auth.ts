import NextAuth from "next-auth";
import { tenantAuthConfig } from "@rifaxapp/auth";

export const { handlers, auth, signIn, signOut } = NextAuth(tenantAuthConfig);
