import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getControlPrismaClient, verifyPassword } from "@rifaxapp/db-control";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : null;
        const password = typeof credentials?.password === "string" ? credentials.password : null;
        if (!email || !password) return null;

        const prisma = getControlPrismaClient();
        const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
        if (!superAdmin) return null;

        const valid = await verifyPassword(password, superAdmin.passwordHash);
        if (!valid) return null;

        return {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.nombre ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
