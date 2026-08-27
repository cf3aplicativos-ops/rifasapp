import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@rifaxapp/db-control";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import "./types";

/**
 * Config de Auth.js compartida por las apps de tenant (admin, y más
 * adelante vendedores/clientes). A diferencia de una config "perezosa" que
 * re-resuelve el tenant por Host en cada invocación, este `authorize` recibe
 * el `tenantId` como un credential más — quien llama a `signIn` (ver
 * apps/admin/src/app/login/actions.ts) lo resuelve una sola vez con
 * `headers()`/`resolveTenantFromHost` y lo pasa explícito.
 *
 * Se probó primero resolver el tenant DENTRO de esta config a partir del
 * `request` que Auth.js pasa a una inicialización perezosa, y falló en la
 * práctica: cuando `signIn()` se invoca desde un Server Action, Auth.js
 * reconstruye su propio request/headers internamente para procesar el
 * callback de credentials, y esa reconstrucción a veces devuelve el host
 * BASE sin el subdominio del tenant (ej. "localhost:3001" en vez de
 * "acme.localhost:3001") — tanto vía `request.headers` como vía
 * `next/headers`, de forma inconsistente entre invocaciones. Resolver el
 * tenant una sola vez del lado del caller y pasarlo como dato explícito
 * evita depender de esa reconstrucción.
 */
export const tenantAuthConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : null;
        const password = typeof credentials?.password === "string" ? credentials.password : null;
        const tenantId = typeof credentials?.tenantId === "string" ? credentials.tenantId : null;
        if (!email || !password || !tenantId) return null;

        const prisma = await getTenantPrismaClient(tenantId);
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) return null;

        const valid = await verifyPassword(password, usuario.passwordHash);
        if (!valid) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre ?? undefined,
          tenantId,
          sedeId: usuario.sedeId,
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      // Chequeo optimista de sesión nada más — sin llamadas a la DB acá.
      // Ver la nota larga arriba: el proxy/middleware corre en un bundle
      // aislado donde una consulta a la DB (para resolver el tenant por
      // Host) resultó no confiable en la práctica. La resolución de tenant
      // por Host se hace en /login (Server Component, contexto confiable);
      // una vez logueado, la sesión ya trae `tenantId` — no hace falta
      // volver a resolverlo por Host en cada request protegido.
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.sedeId = user.sedeId;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      if (token.tenantId) session.user.tenantId = token.tenantId;
      session.user.sedeId = token.sedeId ?? null;
      if (token.rol) session.user.rol = token.rol;
      return session;
    },
  },
};
