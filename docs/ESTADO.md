# Estado del desarrollo — Rifaxapp

> Léeme primero al empezar cualquier sesión de trabajo (desde cualquier equipo/agente). Actualízame al final de cada sesión: qué se hizo, qué quedó a medias, decisiones tomadas y el próximo paso concreto.

## Última actualización

**2026-08-26** — Fase 1 completa: `packages/db-control` + login/CRUD/provisioning real en `apps/superadmin`.

## Fase actual

**Fase 1 — control-plane + superadmin** cerrada. Fase 0 sigue cerrada salvo el dominio (pospuesto a pedido del usuario). Próxima: Fase 2 (`packages/db-tenant` + `packages/tenant-resolver`).

## Qué se completó en esta sesión

- Plan de acción completo aprobado por el usuario (decisiones clave: 1 DB por tenant en un mismo proyecto Neon, monorepo Turborepo con 4 apps separadas, ruteo por subdominio con Next.js Multi Zones, Auth.js con credenciales propias). Detalle en `docs/ARQUITECTURA.md` y `docs/DECISIONES.md`.
- `gh` CLI (2.98.0) y `vercel` CLI (59.5.0) instalados y **autenticados**: `gh` como `cf3aplicativos-ops`, `vercel` como `cf3aplicativos-9248` (team `rifa7`, org id `team_9E0DHiFoueL3qhER9yrUzafy`).
- Monorepo Turborepo scaffoldeado con npm workspaces. 4 apps Next.js 16.3.3 (`create-next-app`, TS + App Router + Tailwind + ESLint): `apps/superadmin` (3000), `apps/admin` (3001), `apps/vendedores` (3002), `apps/clientes` (3003). Paquetes `@rifaxapp/<app>`.
- `npm run build` verde para los 4 apps. Vitest + Playwright configurados a nivel raíz (sin specs reales aún, se agregan desde Fase 1/3).
- **Git**: repo inicializado, identidad `cf3aplicativos-ops` / `jaiguaranosorio@gmail.com`, push hecho a `main` en `cf3aplicativos-ops/rifasapp` (commits `7e7dea9`, `1759e3b`).
- **Vercel**: 4 proyectos creados (`rifaxapp-superadmin`, `rifaxapp-admin`, `rifaxapp-vendedores`, `rifaxapp-clientes`) bajo el team `rifa7`, cada uno con `Root Directory` apuntando a su carpeta (`apps/<app>`), conectados al repo de GitHub (`vercel git connect`, sin necesidad de instalar nada extra manualmente — el CLI maneja la conexión). Push a `main` ya dispara build+deploy automático en los 4 — verificado en verde (status `Ready`) para el commit `1759e3b`.
- Deploys de producción quedan detrás del **Deployment Protection** por defecto de Vercel para proyectos de equipo (redirige a login de Vercel) — es el comportamiento esperado, no un error. Para verlos hay que estar logueado en el dashboard de Vercel con la cuenta del team `rifa7`.

## Pendiente (Fase 0, para cerrar el gate completo)

1. ~~Proyecto Neon "control-plane"~~ — **hecho 2026-08-26**, ver sección de abajo.
2. **Dominio `rifaxapp.com`** — usuario decidió posponerlo sin bloquear el trabajo (2026-08-26). No confirmado si ya está comprado y en qué proveedor DNS. Se necesita para el wildcard `*.rifaxapp.com` en Vercel y las rewrites de Multi Zones (`/admin/**`, `/vendedores/**`). Mientras tanto los 4 apps siguen accesibles solo por sus URLs `*.vercel.app` individuales (protegidas por Vercel) — sirven para probar builds pero no para el ruteo multi-tenant real. Retomar cuando el usuario lo indique, no bloquea Fase 1+.
3. Confirmar con el usuario si el nombre/email de git (`cf3aplicativos-ops` / `jaiguaranosorio@gmail.com`) es el definitivo — no hubo objeción hasta ahora.

## Neon control-plane (2026-08-26)

- Instalado vía `vercel integration add neon --name rifaxapp-control-plane` (CLI, no dashboard) desde `apps/superadmin`, con el `vercel` CLI ya logueado como `cf3aplicativos-9248`.
- Recurso Neon `rifaxapp-control-plane` provisionado bajo el team `rifa7` y conectado automáticamente al proyecto `rifaxapp-superadmin`.
- El CLI bajó las env vars al `apps/superadmin/.env.local` (sobrescrito): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `NEON_PROJECT_ID`, `NEON_AUTH_BASE_URL`, `VERCEL_OIDC_TOKEN`, entre otras. Archivo ya está en `.gitignore`, no se commiteó.
- Para Prisma + `@prisma/adapter-neon` (ver `docs/ARQUITECTURA.md`) usar `POSTGRES_PRISMA_URL` (pooled, `-pooler`) como connection string de runtime; `DATABASE_URL_UNPOOLED`/`POSTGRES_URL_NON_POOLING` para migraciones.
- Estas env vars están solo en `apps/superadmin` (donde vive el control-plane). Confirmado con `vercel env ls` (2026-08-26): las 18 vars están sincronizadas en Production, Preview y Development — no solo en el pull local.
- Dos warnings no bloqueantes al instalar: falló la instalación automática de "agent skills" de Neon (`npx skills add ...`) — no afecta el provisioning, se puede ignorar o correr manualmente si se quiere esa skill.

## Notas operativas para quien retome (importante — fricción real que ya se resolvió una vez)

- En esta máquina Windows, las herramientas instaladas por fuera de una sesión de terminal (via `winget`/`npm -g` corridas por un agente) **no aparecen en el PATH de una terminal ya abierta**, ni siquiera abriendo una pestaña "nueva" dentro de la misma app de terminal (hereda el entorno del proceso padre). Fix rápido dentro de la sesión actual sin reiniciar nada:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```
- Además, la política de ejecución de PowerShell en esta máquina bloquea los shims `.ps1` de npm (`npm.ps1`, `vercel.ps1` etc.) con `UnauthorizedAccess`. Workaround sin tocar la política de seguridad del sistema: anteponer `cmd /c` al comando, ej. `cmd /c "npm install -g vercel"`, `cmd /c vercel login`.
- El login interactivo de `vercel login` (device code por navegador) falló repetidamente ("Couldn't verify the code") pese a hacerlo bien — parece un problema del lado de Vercel/latencia, no del usuario. Se resolvió generando un **Personal Access Token** en vercel.com/account/tokens y usándolo con `--token` en cada comando del CLI (o `$env:VERCEL_TOKEN`). Si vuelve a pasar, saltar directo a esta vía en lugar de reintentar el device code.
- El token de Vercel usado en esta sesión fue pegado por el usuario directamente en el chat — **no quedó guardado en ningún archivo del repo** (se usó solo como variable de entorno/flag en comandos puntuales). Si se quiere evitar tenerlo en el historial del chat, se puede rotar/revocar desde vercel.com/account/tokens y generar uno nuevo para la siguiente sesión.

## Fase 1 — control-plane + superadmin (2026-08-26)

**Infraestructura nueva:**
- Segundo proyecto Neon `rifaxapp-tenants-host` (separado del control-plane, tal como quedó decidido en `docs/DECISIONES.md`) provisionado vía `vercel integration add neon --name rifaxapp-tenants-host --prefix TENANTS_HOST_`, conectado a `apps/superadmin`. Sus env vars viven con prefijo `TENANTS_HOST_*` en `apps/superadmin/.env.local`.
- `CONTROL_PLANE_ENCRYPTION_KEY` (AES-256, 32 bytes) y `AUTH_SECRET` generados y agregados a `apps/superadmin/.env.local`. **Pendiente**: subirlas a Vercel (Production/Preview/Development) — el clasificador de auto-mode bloqueó `vercel env add` dos veces (parece bloquear la acción categóricamente, no por el contenido del valor). Comando pendiente de correr manualmente o con permiso explícito del usuario:
  ```bash
  vercel env add CONTROL_PLANE_ENCRYPTION_KEY production,preview,development --value "<ver .env.local>" --yes --sensitive
  vercel env add AUTH_SECRET production,preview,development --value "<ver .env.local>" --yes --sensitive
  ```
  No bloquea desarrollo local, solo hace falta antes de un deploy a producción real.

**`packages/db-control`** (nuevo, `@rifaxapp/db-control`, sin build step — mismo patrón que `packages/ui`):
- Prisma 6.19.3 (**no 7.x** — la 7.x instala un toolchain nuevo con `@prisma/composer-cli`/Cloudflare/Alchemy que rompe el install en Windows con errores `ENOTEMPTY`/`EPERM` al borrar `node_modules` anidados; si se actualiza Prisma en el futuro, probar en limpio antes de asumir que funciona).
- Schema (`prisma/schema.prisma`): `Tenant` (slug, nombre, connectionStringCifrado, estado `PROVISIONANDO|ACTIVO|SUSPENDIDO|ERROR`) y `SuperAdmin` (email, passwordHash, nombre). Migración `20260826195731_init` ya aplicada contra la DB real de control-plane.
- `src/client.ts`: `getControlPrismaClient()`, cliente cacheado en `globalThis`. **Ojo con la API de `@prisma/adapter-neon` v6**: `new PrismaNeon(config)` recibe un objeto `{connectionString}`, **no** una instancia de `Pool` ya construida — pasar un `Pool` (como sugieren ejemplos más viejos) falla en runtime con un error engañoso ("No database host or connection string was set") que no menciona la causa real.
- `src/crypto.ts`: `encryptConnectionString`/`decryptConnectionString` (AES-256-GCM) para el `connectionStringCifrado` de cada tenant.
- `src/password.ts`: `hashPassword`/`verifyPassword` (bcryptjs) para `SuperAdmin`.
- `prisma/seed.ts` (`npm run db:seed -w @rifaxapp/db-control`, requiere `SUPERADMIN_SEED_EMAIL`/`SUPERADMIN_SEED_PASSWORD` en el entorno): ya corrido una vez, ver credenciales abajo.

**`apps/superadmin`** (Auth.js v5 beta + CRUD + provisioning real):
- `src/auth.ts`: Auth.js (`next-auth@5.0.0-beta.32` — la línea estable "latest" sigue siendo v4, hay que instalar explícitamente con `next-auth@beta`), Credentials provider contra `SuperAdmin`, sesión JWT, `callbacks.authorized` gatea todo excepto `/login` y `/api/auth/*`.
- `src/proxy.ts`: en Next.js 16 `middleware.ts` está deprecado y renombrado a `proxy.ts` (misma API, runtime Node.js forzado). Export: `export { auth as proxy } from "@/auth"`.
- `src/app/login/` + `src/app/(protected)/` (layout con `requireSuperAdmin()` + botón salir, `tenants/page.tsx` con listado y form, `tenants/actions.ts` con `createTenant`/`deleteTenant`).
- **Provisioning real**: `createTenant` valida el slug, inserta el `Tenant` en `PROVISIONANDO`, corre `CREATE DATABASE "tenant_<slug>"` con SQL plano (`pg`) contra `TENANTS_HOST_DATABASE_URL_UNPOOLED` — **no hace falta una API key de Neon**, un `CREATE DATABASE` normal alcanza. Arma el connection string del tenant nuevo reusando host/user/password de `TENANTS_HOST_*`, lo cifra y deja el tenant en `ACTIVO`. `deleteTenant` hace `DROP DATABASE` + borra la fila. **Alcance explícito**: no crea todavía el primer `TENANT_ADMIN` dentro de la DB del tenant — eso requiere el schema `packages/db-tenant`, que queda para Fase 2; por ahora el tenant queda `ACTIVO` con la DB vacía.
- Probado de punta a punta en real (browser + Neon): login → crear tenant → verificar `ACTIVO` → confirmar que la DB existe en Neon (`SELECT datname FROM pg_database`) → borrar → confirmar que desaparece. Sin datos de prueba residuales.

**Pruebas:**
- Vitest: `packages/db-control/src/crypto.test.ts` (round-trip, ciphertext alterado) + `apps/superadmin/src/app/(protected)/tenants/actions.test.ts` (validación de slug, duplicados, mocks de Prisma/pg) — 7 tests, todos verdes (`npm test`).
- Playwright: `e2e/superadmin-tenant-flow.spec.ts` (login real → crear tenant real → verificar `ACTIVO` → borrar con diálogo `confirm()` → verificar que desaparece). Corre contra Neon real, no mocks. Requiere `SUPERADMIN_SEED_EMAIL`/`SUPERADMIN_SEED_PASSWORD` en el entorno y el dev server de `apps/superadmin` corriendo; se salta solo (`test.skip`) si faltan esas env vars. Correr con `npx playwright test --project=superadmin` (el `--project` es necesario porque `playwright.config.ts` no filtra specs por app). Pasó en verde.
- `npx tsc --noEmit` en `apps/superadmin` y `next build` (producción) verdes. `npm run check-types` (turbo) solo corre en `db-control`/`ui` — los 4 apps no tienen script `check-types` propio (preexistente, no es de esta sesión).
- `npm run lint` (turbo) **falla en los 4 apps + `packages/ui`** con `typescript-eslint does not support TS 7.0` — preexistente: el `typescript` de la raíz/`ui` está pinneado en `7.0.2` y `typescript-eslint` (vía `eslint-config-next`) todavía no soporta TS 7. No es algo que haya roto esta sesión (ninguna app tocó su versión de `typescript`); pendiente de decidir si se baja `typescript` a la línea 6.x en todo el repo o se espera a que `typescript-eslint` agregue soporte.

**Credenciales del SuperAdmin sembrado** (cambiarlas cuando el usuario quiera):
- Email: `jaiguaranosorio@gmail.com`
- Password generado: `lqZHvd0RM1lJ6bRT` (ver `apps/superadmin/.env.local` para `SUPERADMIN_SEED_EMAIL`/`SUPERADMIN_SEED_PASSWORD` si hay que re-correr el seed)

**Fricciones de esta sesión (para quien retome):**
- El `devEngines.packageManager` de la raíz estaba pinneado a npm `11.17.0`; esta máquina ya tenía `11.19.0`, lo que bloqueaba **todo** `npm install` con `EBADDEVENGINES`. Se actualizó el pin al valor real.
- El proceso lanzado por la herramienta de preview del navegador (`preview_start`) no hereda `NODE_EXTRA_CA_CERTS` (esta máquina tiene Avast interceptando TLS), así que las conexiones WebSocket a Neon fallan ahí con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Workaround usado: lanzar `next dev` desde una shell que sí tenga esa env var (bash normal la tiene) en vez de dejar que la herramienta de preview lo lance.
- `vercel env add` fue bloqueado dos veces por el clasificador de auto-mode de Claude Code (acción de "cambiar configuración de cuenta"), incluso con confirmación previa del usuario en el chat — ver pendiente de `CONTROL_PLANE_ENCRYPTION_KEY`/`AUTH_SECRET` arriba.

## Próximo paso concreto

1. **Fase 2**: `packages/db-tenant` (schema Prisma "plantilla" que se despliega en cada DB de tenant: `Sede`, `Usuario` con roles `TENANT_ADMIN`/`SEDE_ADMIN`/`VENDEDOR`/`CLIENTE`, `Rifa`, `Boleto`, `Venta`, `Cliente`, `Pago`) + `packages/tenant-resolver` (resuelve tenant por subdominio, factory de `PrismaClient` dinámico usando el `connectionStringCifrado` guardado en el control-plane). Con eso, extender `createTenant` para correr las migraciones de `db-tenant` contra la DB recién creada y crear el primer `TENANT_ADMIN`.
2. Subir `CONTROL_PLANE_ENCRYPTION_KEY` y `AUTH_SECRET` a Vercel (bloqueado por el clasificador esta sesión, ver arriba).
3. Dominio y wildcard `*.rifaxapp.com` / Multi Zones siguen pospuestos a pedido del usuario.
4. Decidir si se baja `typescript` a 6.x en todo el repo para que `npm run lint` vuelva a funcionar (preexistente, no bloqueante para desarrollar).

## Cierre de sesión — 2026-08-25 (noche)

Sesión pausada a pedido del usuario ("paremos acá y continuamos mañana"). No quedó nada a medias sin commitear — todo lo de esta sesión está pusheado a `main` (`1db1dc6`). Lo único pendiente es que el usuario responda las dos preguntas de arriba (Neon y dominio) para poder cerrar el gate de Fase 0. Quien retome: lee este archivo completo antes de tocar nada.

## Notas técnicas de arquitectura para quien retome

- Next.js 16.3.3 es muy reciente: leer `node_modules/next/dist/docs/` (dentro de cada app) antes de escribir routing/middleware/server actions — hay cambios de breaking respecto a versiones anteriores.
- Puertos de dev fijos por app: superadmin=3000, admin=3001, vendedores=3002, clientes=3003 (`npm run dev` a nivel raíz levanta los 4 en paralelo vía Turborepo).
- El plan completo de fases (0 a 7) con sus "gates" de pruebas está resumido en `docs/ARQUITECTURA.md`.
