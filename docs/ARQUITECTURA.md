# Arquitectura — Rifaxapp

SaaS multi-tenant de rifas, multi-sede por tenant. Nosotros (los desarrolladores) somos el **superadmin** del SaaS.

## Aislamiento de datos

- **1 proyecto Neon "control-plane"**: una sola base de datos central con la tabla `Tenant` (slug, nombre, connection string cifrado, estado) y los usuarios `SUPERADMIN`.
- **1 base de datos por tenant** (`CREATE DATABASE tenant_<slug>`), dentro de un proyecto Neon dedicado a alojar tenants (mismo compute/facturación, datos separados por base de datos — patrón recomendado por Neon para SaaS con muchos tenants, evita los límites de "número de proyectos" del plan).
- Cada base de datos de tenant contiene: `Sede`, `Usuario` (roles `TENANT_ADMIN`, `SEDE_ADMIN`, `VENDEDOR`, `CLIENTE`), `Rifa`, `Boleto`, `Venta`, `Cliente`, `Pago`.
- Conexiones desde funciones serverless usan el connection string **pooled** de Neon (`-pooler`) + `@prisma/adapter-neon`, para no agotar conexiones al tener N bases de datos.
- Provisioning de un tenant nuevo = API de Neon (crear DB) + `prisma migrate deploy` contra esa DB + guardar connection string cifrado en control-plane + crear el primer `TENANT_ADMIN`.

## Apps (Turborepo monorepo, npm workspaces)

```
apps/
  superadmin/   -> puerto 3000. Gestión de tenants (nosotros). Conecta solo a la DB control-plane.
  admin/        -> puerto 3001. Dashboard tenant-admin + sede-admin (mismo app, vista según rol).
  vendedores/   -> puerto 3002. Portal de vendedores, scoped a su sede.
  clientes/     -> puerto 3003. Portal de clientes, scoped a su tenant.
packages/
  ui/                 -> componentes compartidos (del scaffold create-turbo)
  eslint-config/       -> config ESLint compartida
  typescript-config/   -> config TypeScript compartida
  db-control/          -> (Fase 1) Prisma schema + client de la DB control-plane
  db-tenant/           -> (Fase 2) Prisma schema "plantilla" desplegado en cada DB de tenant
  tenant-resolver/     -> (Fase 2) resuelve tenant por subdominio + factory de PrismaClient dinámico
  auth/                -> (Fase 3) configuración Auth.js reusable + helpers RBAC
```

Cada app fue generada con `create-next-app` (App Router, TypeScript, Tailwind, ESLint). **Next.js 16.3.3**: versión muy nueva, con cambios de breaking respecto a Next 14/15 — antes de escribir routing/middleware/server actions revisar `node_modules/next/dist/docs/` desde la carpeta de la app correspondiente (ver `AGENTS.md` en cada app).

## Ruteo multi-zona (pendiente de implementar en Fase 0/2)

- `{tenant}.rifaxapp.com` → servido por `apps/clientes` (dominio público del tenant).
- Vía **Next.js Multi Zones** (rewrites en `next.config`), `{tenant}.rifaxapp.com/admin/**` y `/vendedores/**` se reenvían a los deployments de Vercel de `apps/admin` y `apps/vendedores`, preservando el host original para que esas apps resuelvan el mismo tenant.
- `app.rifaxapp.com` (fijo, sin wildcard) → `apps/superadmin`, sin concepto de tenant.
- Requiere dominio `rifaxapp.com` + wildcard `*.rifaxapp.com` configurado en Vercel.

## Autenticación y RBAC

- Middleware en cada app de tenant lee el `Host`, resuelve el tenant vía `packages/tenant-resolver`, obtiene el `PrismaClient` de esa DB (con cache en memoria por tenant para reutilizar conexiones en invocaciones warm).
- Auth.js (NextAuth) Credentials provider valida contra la tabla `Usuario` de esa DB específica. JWT/sesión lleva `{tenantId, sedeId|null, role, userId}`.
- Reglas: `TENANT_ADMIN` (sedeId null) ve todas las sedes de su tenant; `SEDE_ADMIN`/`VENDEDOR` quedan filtrados por su `sedeId`; `CLIENTE` scoped a tenant (sin sede fija).

## Testing

- **Vitest** (`npm test`, config raíz `vitest.config.ts`) para unit/integración, escaneando `apps/*/src` y `packages/*/src`.
- **Playwright** (`npm run test:e2e`, config raíz `playwright.config.ts`) para e2e multi-app, un `project` por app apuntando a su puerto de dev. Specs en `e2e/`.
- Regla dura: no se cierra un módulo/fase sin que las pruebas relevantes pasen.

## Despliegue

- 4 proyectos Vercel (uno por app), `Root Directory` apuntando a cada carpeta bajo `apps/`, conectados al repo de GitHub `cf3aplicativos-ops/rifasapp` vía la Vercel GitHub App (push a `main`/rama → deploy automático).
- El plan completo de fases está en el historial de planificación; el estado vivo del desarrollo está en `docs/ESTADO.md`.
