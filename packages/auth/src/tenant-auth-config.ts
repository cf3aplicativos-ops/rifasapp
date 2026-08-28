import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@rifaxapp/db-control";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import "./types";

/**
 * Config de Auth.js compartida por las apps de tenant (admin, vendedores,
 * clientes). A diferencia de una config "perezosa" que re-resuelve el
 * tenant por Host en cada invocación, este `authorize` recibe el
 * `tenantId` como un credential más — quien llama a `signIn` (ver
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
 *
 * `signInPath` (Fase 13, Multi Zones): `pages.signIn` de Auth.js NO hereda
 * el `basePath` de Next.js como sí lo hacen `next/link`/`redirect()` de
 * `next/navigation` — confirmado en la práctica, el redirect
 * "no autenticado" de Auth.js aterrizaba en "/login" a secas (perdiendo el
 * prefijo "/admin"/"/vendedores" y, con él, el subdominio del tenant en el
 * browser). `admin`/`vendedores` pasan su ruta completa
 * ("/admin/login"/"/vendedores/login"); `clientes` (zona raíz, sin
 * basePath) usa el default.
 *
 * `createTenantAuthConfig(appName)` en vez de un objeto estático único: en
 * producción `admin`/`vendedores`/`clientes` sirven bajo el MISMO host
 * `{tenant}.rifaxapp.com` (Multi Zones, ver docs/ARQUITECTURA.md) — las
 * cookies de sesión NO se scopean por puerto, así que si las 3 apps usaran
 * el nombre de cookie default de Auth.js (`authjs.session-token`), loguearse
 * en una pisaría la cookie de las otras (y como cada app tiene su propio
 * `AUTH_SECRET`, la sesión de la app "pisada" queda indescifrable — se ve
 * como sesión inválida, no como un error obvio). `appName` entra en el
 * nombre de la cookie para que cada app tenga la suya. Se descubrió esto en
 * Fase 5, con un e2e que iba y volvía entre admin/vendedores/clientes en el
 * mismo browser context (mismo hostname `*.localhost`, distinto puerto —
 * los puertos tienen el mismo problema de scoping que Multi Zones en prod).
 */
export function createTenantAuthConfig(appName: string, signInPath = "/login"): NextAuthConfig {
  return {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: signInPath },
  cookies: {
    sessionToken: { name: `authjs.session-token.${appName}` },
    callbackUrl: { name: `authjs.callback-url.${appName}` },
    csrfToken: { name: `authjs.csrf-token.${appName}` },
  },
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
      // `token.sub` es el id del Usuario (Auth.js lo setea automáticamente a
      // partir del `id` que devuelve `authorize` en el sign-in) — no viaja
      // solo, hay que copiarlo a mano como el resto de los campos custom.
      if (token.sub) session.user.id = token.sub;
      if (token.tenantId) session.user.tenantId = token.tenantId;
      session.user.sedeId = token.sedeId ?? null;
      if (token.rol) session.user.rol = token.rol;
      return session;
    },
  },
  };
}
