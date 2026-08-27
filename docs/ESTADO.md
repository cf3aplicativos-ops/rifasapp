# Estado del desarrollo — Rifaxapp

> Léeme primero al empezar cualquier sesión de trabajo (desde cualquier equipo/agente). Actualízame al final de cada sesión: qué se hizo, qué quedó a medias, decisiones tomadas y el próximo paso concreto.

## Última actualización

**2026-08-26** — Fase 4 completa: `apps/vendedores` (solo rol VENDEDOR) + `apps/clientes` (con registro público de CLIENTE), ambas reusando `packages/auth`.

## Fase actual

**Fase 4 — apps/vendedores + apps/clientes** cerrada. Fases 0-3 siguen cerradas (dominio pospuesto a pedido del usuario). Próxima: Fase 5 (a definir con el usuario — probablemente diseñar `Rifa`/`Boleto`/`Venta`/`Cliente`/`Pago` cuando haya reglas de negocio, ya que las 4 apps y el login multi-rol están completos).

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
- `CONTROL_PLANE_ENCRYPTION_KEY` (AES-256, 32 bytes) y `AUTH_SECRET` generados y agregados a `apps/superadmin/.env.local`, y **ya subidos a Vercel** (Production/Preview/Development) — el clasificador de auto-mode bloqueó `vercel env add` corrido por el agente, así que las subió el usuario manualmente desde su propia terminal. Dos gotchas que aparecieron al hacerlo así (dejar anotado para la próxima vez que alguien lo corra a mano):
  - La lista de entornos separada por comas (`production,preview,development`) le llegó a Vercel con espacios en vez de comas al copiar/pegar el comando desde este chat (`Invalid environment: production preview development`) — solución: correr `vercel env add <NOMBRE> <entorno>` tres veces (una por entorno) en vez de la forma con comas.
  - `vercel env add` fallaba con `unable to verify the first certificate` (Avast interceptando TLS en esa terminal, mismo problema que con Neon — ver nota de `NODE_EXTRA_CA_CERTS`/proxy más abajo) — se resolvió con `$env:NODE_OPTIONS = "--use-system-ca"` en esa sesión de PowerShell antes de correr los comandos.
  - Redeploy final: `vercel redeploy <url-del-deployment>` (sin `--yes`, esa flag no existe para este subcomando) para que el deploy ya construido tomara las env vars nuevas sin esperar a un push. Quedó `● Ready` y aliaseado a `https://rifaxapp-superadmin.vercel.app`.

**`packages/db-control`** (nuevo, `@rifaxapp/db-control` — sí tiene un `build` step, ver más abajo por qué):
- Prisma 6.19.3 (**no 7.x** — la 7.x instala un toolchain nuevo con `@prisma/composer-cli`/Cloudflare/Alchemy que rompe el install en Windows con errores `ENOTEMPTY`/`EPERM` al borrar `node_modules` anidados; si se actualiza Prisma en el futuro, probar en limpio antes de asumir que funciona).
- `package.json` tiene `"build": "prisma generate --schema=prisma/schema.prisma"` **a propósito** (no es solo `check-types` como `packages/ui`): el `@prisma/client` genérico no trae los modelos `Tenant`/`SuperAdmin` hasta que corre `prisma generate`. Un `postinstall` normal **no sirve en este entorno**: tanto local como en el build de Vercel, npm gatea los lifecycle scripts automáticos con una política de "allow-scripts" (se ve en los logs como `npm warn install-scripts ... not yet covered by allowScripts` — pasa con Prisma, esbuild, etc. igual). La solución fue usar el grafo de tareas de Turborepo: como `turbo.json` tiene `"build": {"dependsOn": ["^build"]}`, agregar el script `build` a `db-control` hace que corra automáticamente antes del build de cualquier app que dependa de él. `packages/db-control/turbo.json` declara los `outputs` de ese paso (`node_modules/.prisma/**`) para que el cacheo de Turbo no tire warnings.
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
- **`devEngines.packageManager` vs `packageManager` (Corepack)**: el pin original a npm `11.17.0` bloqueaba `npm install` en esta máquina (`11.19.0` instalado) con `EBADDEVENGINES`. Cambiarlo a un rango (`">=11.0.0"`) "arregló" el install pero rompió el build en Vercel de otra forma — la versión global de Turbo ahí no puede parsear un rango en `devEngines.packageManager` y tira `Could not resolve workspace. Missing devEngines.packageManager or legacy packageManager field`. La solución final: usar el campo clásico de Corepack `"packageManager": "npm@11.17.0"` en vez de `devEngines` — Turbo lo resuelve bien y, a diferencia de `devEngines`, npm no lo usa para bloquear el install si la versión real no coincide exacto. **Lección**: en este repo, `packageManager` (no `devEngines`) es el campo correcto para que Turbo identifique el package manager.
- **Vercel deploys — orden de los 3 fixes reales** (útil si se repite un patrón parecido): 1) `devEngines`→`packageManager` (arriba), 2) el build fallaba en type-check porque nada corría `prisma generate` antes de `next build` (ver nota de `db-control` arriba), 3) advertencia de Turbo por env vars de Vercel no declaradas en `turbo.json` (agregadas al array `env` de la tarea `build`). Cada fix se descubrió leyendo el log real de `vercel inspect <url> --logs` — no asumir que un fix anterior resolvió todo, siempre revisar el log completo del deploy siguiente.
- El proceso lanzado por la herramienta de preview del navegador (`preview_start`) no hereda `NODE_EXTRA_CA_CERTS` (esta máquina tiene Avast interceptando TLS), así que las conexiones WebSocket a Neon fallan ahí con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Workaround usado: lanzar `next dev` desde una shell que sí tenga esa env var (bash normal la tiene) en vez de dejar que la herramienta de preview lo lance.
- `vercel env add` fue bloqueado repetidamente por el clasificador de auto-mode de Claude Code (acción de "cambiar configuración de cuenta"), incluso con confirmación previa del usuario en el chat. Se resolvió pidiéndole al usuario que corriera los comandos él mismo desde su terminal (ver gotchas de comas/TLS arriba). Igual pasó con `git push` en un punto de esta sesión — a veces el clasificador lo bloqueaba, a veces no, sin patrón claro; si vuelve a pasar, la salida es pedirle al usuario que lo corra él.

## Estado de deploy — 2026-08-26 (verificado en producción)

`rifaxapp-superadmin` deployado y **`● Ready`** en `https://rifaxapp-superadmin.vercel.app`, con `AUTH_SECRET` y `CONTROL_PLANE_ENCRYPTION_KEY` ya presentes en Production/Preview/Development. No se hizo un login real contra la URL de producción en esta sesión (queda detrás del Deployment Protection de Vercel para proyectos de equipo) — quien retome puede probarlo logueado en el dashboard de `rifa7`, o simplemente confiar en que el mismo código ya se probó de punta a punta contra Neon real en local (ver sección de Fase 1 arriba).

## Fase 2 — db-tenant + tenant-resolver + primer TENANT_ADMIN (2026-08-26)

**Alcance acotado a propósito** (confirmado con el usuario, ver `docs/ARQUITECTURA.md` para la lectura completa): el schema de `db-tenant` en esta fase es **solo `Sede` + `Usuario`** — lo mínimo para que exista el primer `TENANT_ADMIN` y quede la base del login multi-rol de Fase 3. `Rifa`/`Boleto`/`Venta`/`Cliente`/`Pago` (producto real de rifas) quedan para una fase futura, junto con las reglas de negocio y pantallas que los necesiten — no se inventaron ahora. `tenant-resolver` en esta fase es **solo el factory de `PrismaClient` dinámico**; la resolución por Host/subdominio y el middleware que la usa quedan para Fase 3 (cuando exista dominio + una app real).

**`packages/db-tenant`** (nuevo, `@rifaxapp/db-tenant`, mismo patrón que `db-control`):
- **Generator con `output` propio** (`generator client { output = "../src/generated/client" }`) — **importante**: dos schemas de Prisma en el mismo workspace NO pueden usar el output default de `@prisma/client` a la vez, se pisarían el uno al otro en el `node_modules` compartido. `db-control` se dejó intacto (sigue con el default); si se agrega un tercer schema en el futuro, también necesita su propio `output`.
- Schema: `enum UsuarioRol { TENANT_ADMIN SEDE_ADMIN VENDEDOR CLIENTE }`, `model Sede`, `model Usuario` (`sedeId` nulo para `TENANT_ADMIN`/`CLIENTE`, seteado para `SEDE_ADMIN`/`VENDEDOR`, según la regla de RBAC de `ARQUITECTURA.md`). Usa `@default(uuid())` (no `cuid()` como `db-control`) porque el insert del primer admin se hace con SQL crudo, generando el id con `crypto.randomUUID()`.
- **Cómo se aplica el schema a cada tenant nuevo**: NO se invoca `prisma migrate deploy` en runtime (frágil en serverless, requeriría spawnear el engine de Prisma) ni se lee `migration.sql` del disco en runtime. En vez de eso, `src/schema-sql.ts` exporta el DDL completo como una constante de TypeScript (`TENANT_SCHEMA_SQL`), generada una vez corriendo `prisma migrate dev` contra una DB Neon descartable (se creó y se borró `tenant__migration_scratch` en `rifaxapp-tenants-host` solo para esto) y pegando el SQL resultante. **Si el schema de `db-tenant` cambia**: repetir ese proceso (DB descartable → `npm run db:migrate` → copiar el SQL nuevo a `schema-sql.ts`) — no hay automatización todavía.
- `src/client.ts`: `createTenantPrismaClient(connectionString)` — a diferencia de `db-control`, NO cachea en `globalThis` (hay N tenants, cada uno con su propia conexión; el cacheo por tenant es responsabilidad de `tenant-resolver`).

**`packages/tenant-resolver`** (nuevo, `@rifaxapp/tenant-resolver`):
- `getTenantPrismaClient(tenantId)`: busca el `Tenant` en el control-plane, descifra su connection string, devuelve un `PrismaClient` cacheado en un `Map` a nivel de módulo (sin límite de tamaño/TTL por ahora).
- `evictTenantPrismaClient(tenantId)`: **necesario para poder borrar un tenant** — si un `PrismaClient` de ese tenant quedó cacheado (por ejemplo, por la verificación que hace `createTenant` al final), Postgres/Neon rechaza el `DROP DATABASE` con "being accessed by other users" mientras esa conexión siga viva. `deleteTenant` lo llama antes de intentar el `DROP DATABASE`.
- **Gotcha real encontrado en el e2e**: incluso llamando `evictTenantPrismaClient` (que hace `$disconnect()`), el `DROP DATABASE` seguía fallando — el cierre del lado del cliente no garantiza que la sesión del lado de Neon se cierre al instante. Solución robusta: `DROP DATABASE ... WITH (FORCE)` (Postgres 13+, que sí soporta Neon), en vez de depender de un timing exacto de desconexión.

**Extensión de `createTenant`** (`apps/superadmin/.../tenants/actions.ts`):
- El form suma un campo **"Email del admin"** (requerido). Tras `CREATE DATABASE`, aplica `TENANT_SCHEMA_SQL` y luego inserta el primer `Usuario` (`rol = 'TENANT_ADMIN'`, `sedeId = NULL`, password aleatoria generada y hasheada con `hashPassword` de `db-control`) — todo con el mismo `pg.Client` crudo ya conectado a la DB nueva. Como verificación real de que el tenant quedó usable, llama `getTenantPrismaClient(tenant.id)` y hace `usuario.count()` antes de devolver éxito.
- El banner de éxito en la UI (`create-tenant-form.tsx`) muestra el email y password del admin generado — una sola vez, no se puede volver a consultar después (mismo patrón que el seed del superadmin).

**Warning de build confirmado no-bloqueante**: Turbopack avisa que el cliente de Prisma generado en `db-tenant` (por tener un `output` custom, no el paquete `@prisma/client` de siempre que Next ya externaliza por defecto) hace acceso dinámico a `fs`/`path` para detección de entorno, lo que "arrastra todo el proyecto" al tracing de esa ruta. Se intentó `serverExternalPackages: ["@rifaxapp/db-tenant"]` en `next.config.ts` sin efecto (los packages del workspace se resuelven como código fuente vía `exports` a `.ts`, no como un `require` externo real, así que `serverExternalPackages` no aplica). **Verificado en el deploy real de Vercel** (`vercel inspect`): las funciones serverless quedaron en ~38.86MB cada una — bastante más de lo que deberían pesar, pero muy por debajo del límite de Vercel (250MB), y el deploy quedó `Ready` sin problema. No es urgente, pero si el bundle sigue creciendo con Fase 3+, la vía correcta es `outputFileTracingExcludes` en `next.config.ts` para acotar qué se empaqueta.

**Pruebas** (todas verdes):
- Vitest: 17 tests en total (antes 7) — se sumaron `packages/tenant-resolver/src/index.test.ts` (cacheo, desalojo, error si falta connection string) y se extendió `tenants/actions.test.ts` (email de admin inválido, insert del `TENANT_ADMIN`, `deleteTenant`).
- Playwright (`e2e/superadmin-tenant-flow.spec.ts`, extendido): ahora completa también el email del admin, verifica el banner de credenciales, y **se conecta directo por SQL a la DB del tenant recién creado** para confirmar que la fila `Usuario` con `rol = 'TENANT_ADMIN'` existe de verdad, antes de borrar el tenant. Requiere además `TENANTS_HOST_PGHOST`/`PGUSER`/`PGPASSWORD` en el entorno (antes solo hacía falta el seed del superadmin).
- `next build` de producción vía Turbo (`db-control` → `db-tenant` → `superadmin`, en ese orden por el grafo de tareas) verde.

## Fase 3 — packages/auth + login multi-rol y RBAC en apps/admin (2026-08-26)

**Alcance acotado a propósito** (confirmado con el usuario): además de login/sesión, se sumó un CRUD real de `Sede` y una pantalla para que el `TENANT_ADMIN` invite un `Usuario` (`SEDE_ADMIN`/`VENDEDOR`) — así queda algo tangible para probar RBAC de punta a punta, no solo login. Queda **solo `apps/admin`**; `apps/vendedores`/`apps/clientes` para una fase futura. `Rifa`/`Boleto`/`Venta`/`Cliente`/`Pago` siguen sin diseñarse (mismo criterio que Fase 2).

**Cómo se resuelve el tenant por Host sin dominio real**: se toma el primer label del hostname contra un "dominio base" conocido (`TENANT_BASE_DOMAIN`, default `"localhost"`) — `resolveTenantFromHost`/`extractSlugFromHost` en `packages/tenant-resolver`. En dev, `<slug>.localhost:3001` resuelve solo a `127.0.0.1` en Chromium sin tocar `/etc/hosts`. Cuando exista el dominio real, alcanza con `TENANT_BASE_DOMAIN=rifaxapp.com`.

**`packages/auth`** (nuevo, `@rifaxapp/auth`):
- `src/tenant-auth-config.ts`: **config ESTÁTICA** de Auth.js (no una función perezosa por request) — ver el gotcha grande abajo sobre por qué. El `Credentials` provider recibe `tenantId` como un credential más (no lo resuelve él mismo).
- `src/types.ts`: augmenta `Session`/`JWT` de Auth.js con `tenantId`/`sedeId`/`rol` (lo que pide `ARQUITECTURA.md`).
- `src/rbac.ts`: `assertRole(session, roles)` — helper simple, sin DB, usado en cada Server Action TENANT_ADMIN-only.

**El gotcha grande de esta fase — Host header no confiable dentro de Auth.js/Next.js internals**: se probó primero resolver el tenant DENTRO de una config perezosa de Auth.js (`NextAuth((request) => {...})`), leyendo `request.headers.get("host")`. Falló de forma intermitente y muy confusa — mismo host, a veces resuelve bien y a veces no, sin patrón aparente:
- Al `signIn()` desde un Server Action, el `request` que Auth.js reconstruye internamente para procesar el credentials callback a veces trae el host **sin el subdominio** (`localhost:3001` en vez de `acme.localhost:3001`) — tanto vía `request.headers` como vía `next/headers`.
- **Solución que funcionó**: dejar de resolver el tenant dentro de la config de Auth.js. En su lugar, `loginAction` (Server Action nuestra, contexto confiable) resuelve el tenant una sola vez con `headers()` y lo pasa **explícito** como credential (`tenantId`) a `signIn()`. La config de Auth.js quedó estática, sin request-awareness.
- El **proxy/middleware** (`export { auth as proxy }`) tampoco puede hacer la consulta a la DB para resolver el tenant — se probó y falló también, de forma intermitente (proxy corre en un bundle/contexto aislado de Turbopack, separado del resto de la app; ver el build log: "Middleware" sale como un import trace distinto de "Server Component"/"App Route" para los mismos módulos). La solución: el proxy solo hace el check de sesión (optimista, sin DB, igual que `apps/superadmin`); la resolución de tenant por Host vive solo en `/login` (Server Component) y en `loginAction`, ambos contextos donde se comprobó que es confiable.
- **Un tercer gotcha, más sutil**: incluso con todo lo anterior arreglado, el botón "Salir" (`signOut({ redirectTo: "/login" })` desde una Server Action) terminaba, de forma reproducible, en `/tenant-no-encontrado` — sin ningún log de servidor nuevo que lo explicara. La causa real nunca quedó 100% clara (probablemente algo en cómo Next.js resuelve un `redirect()` encadenado dentro de la respuesta de una Server Action, sin pasar por una request nueva de verdad). La solución robusta: `SignOutButton` es un **Client Component** que usa `signOut()` de `"next-auth/react"` con `redirect: false` + `window.location.href = "/login"` (ruta relativa) hecho a mano — una navegación dura real, que el navegador resuelve solo contra el origen actual, sin pasar por ningún mecanismo de redirect interno de Next/Auth.js. **Lección general de esta fase**: para todo lo que dependa del Host real de la request en una app multi-tenant por subdominio, no confiar en ningún mecanismo interno de reconstrucción de request de Next.js/Auth.js (proxy, config perezaza, redirects encadenados) — solo son confiables `headers()`/`request.headers` leídos directo en el Server Component o Server Action que atiende la request original, o una navegación dura real del lado del cliente.

**Extensión de `packages/tenant-resolver`**: se agregó `resolveTenantFromHost`/`extractSlugFromHost` (`src/resolve-tenant-from-host.ts`) — parsea el host contra `TENANT_BASE_DOMAIN`, busca el `Tenant` en el control-plane, solo lo devuelve si está `ACTIVO`.

**`apps/admin`**:
- `src/proxy.ts`: `export { auth as proxy }`, chequeo de sesión nada más (sin DB) — matcher excluye `/login`, `/tenant-no-encontrado`, `/api/auth`.
- `src/app/login/`: la página resuelve el tenant vía `headers()` (marcada `export const dynamic = "force-dynamic"` a propósito) y redirige a `/tenant-no-encontrado` si no existe; `loginAction` resuelve el tenant de nuevo y lo pasa como credential a `signIn`.
- `src/app/(protected)/`: `layout.tsx` con nav + `SignOutButton` (Client Component, ver arriba), `dashboard/` (info de sesión), `sedes/` (CRUD, TENANT_ADMIN-only), `usuarios/` (invitar `SEDE_ADMIN`/`VENDEDOR` con credenciales generadas, mismo patrón de banner-una-sola-vez que `createTenant`).
- Env vars que necesita (copiadas a mano a `apps/admin/.env.local` desde las de `apps/superadmin`, **no** hace falta `TENANTS_HOST_*` — esas son solo para crear/borrar bases de tenants): `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, `CONTROL_PLANE_ENCRYPTION_KEY` (mismo valor que `superadmin`, es un secreto compartido para des/cifrar) y un **`AUTH_SECRET` propio y distinto** al de `superadmin` (buena práctica, no debería compartirse entre apps). **Ya subidas** a los 3 entornos del proyecto Vercel `rifaxapp-admin` (esta vez `vercel env add` no fue bloqueado por el clasificador de auto-mode — a diferencia de Fase 1, no hubo que pedírselo al usuario).

**Pruebas** (todas verdes, 38 tests unit + 2 specs e2e):
- Vitest: `packages/tenant-resolver/src/resolve-tenant-from-host.test.ts` (parseo de host, tenant no `ACTIVO`) + `apps/admin/.../sedes/actions.test.ts` + `.../usuarios/actions.test.ts` (RBAC, validaciones, credenciales generadas).
- Playwright (`e2e/admin-tenant-rbac-flow.spec.ts`, nuevo): reusa el flujo real de `apps/superadmin` para crear un tenant, entra como su `TENANT_ADMIN` en `http://<slug>.localhost:3001`, crea una `Sede`, invita un `SEDE_ADMIN`, cierra sesión, entra como ese `SEDE_ADMIN` y confirma que su sesión trae el `sedeId` correcto (no null) y que no puede entrar a `/sedes`/`/usuarios`. Todo contra Neon real.
- `next build` de producción de `apps/admin` (y `apps/superadmin`, para confirmar que nada se rompió) vía Turbo, verde.

## Estado de deploy — apps/admin (2026-08-26)

Primer deploy real de `rifaxapp-admin`: **`● Ready`** en `https://rifaxapp-admin.vercel.app` (función serverless ~39MB, igual que `superadmin`, muy por debajo del límite de Vercel). No se probó el login multi-tenant contra la URL de producción en esta sesión (necesitaría un tenant real + wildcard de dominio para probar subdominios ahí, o Deployment Protection de por medio) — el mismo código ya se probó de punta a punta contra Neon real en local (ver Fase 3 arriba).

## Fase 4 — apps/vendedores + apps/clientes (2026-08-26)

**Alcance confirmado con el usuario**: `apps/vendedores` es **solo para el rol VENDEDOR**; `apps/clientes` suma un **registro público** (a diferencia de `SEDE_ADMIN`/`VENDEDOR`, que solo el `TENANT_ADMIN` puede invitar desde `apps/admin`, un `CLIENTE` se crea su propia cuenta). Mismo criterio pragmático de fases anteriores: sin `Rifa`/`Boleto`/`Venta`, así que ambas apps llegan solo hasta login + dashboard con info de sesión.

**El gate de rol vive en cada app, no en `packages/auth`**: la config de Auth.js es compartida y agnóstica de rol (cualquier `Usuario` válido del tenant puede autenticarse en cualquier app de tenant) — cada `(protected)/layout.tsx` decide, después de tener la sesión, si el rol corresponde a ese portal. Si no corresponde, **no hay ningún `redirect()`** — se muestra un mensaje simple ("esta cuenta es {rol}, no tiene acceso a este portal") con el mismo `SignOutButton` de Fase 3, evitando por completo la clase de bug de redirects encadenados que costó tanto diagnosticar en Fase 3.

**`apps/vendedores`**: copia del esqueleto de `apps/admin` (auth, proxy, login, tenant-no-encontrado, dashboard) sin CRUD — el gate en `(protected)/layout.tsx` exige `rol === "VENDEDOR"`.

**`apps/clientes`**: mismo esqueleto, más `src/app/registro/` (pública, excluida del matcher del proxy): `registerAction` resuelve el tenant vía `headers()`, valida email + password (mínimo 8 caracteres), chequea email no duplicado, inserta `Usuario` con `rol: CLIENTE, sedeId: null`, y llama `signIn()` para loguear automático — mismo patrón que `loginAction`, sin ningún problema de redirect encadenado (a diferencia de `signOut`, acá no hay nada raro). El link "¿No tenés cuenta?" en `/login` apunta a `/registro`.

**Env vars**: mismas 4 que `admin` (`POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, `CONTROL_PLANE_ENCRYPTION_KEY` compartida) más un `AUTH_SECRET` propio y distinto por app — copiadas a `.env.local` de cada una y subidas a sus proyectos Vercel (`rifaxapp-vendedores`, `rifaxapp-clientes`) sin bloqueo del clasificador.

**Pruebas** (todas verdes, 40 unit + 4 e2e):
- Vitest: `apps/clientes/src/app/registro/actions.test.ts` (email inválido, password corta, email duplicado, creación exitosa con `sedeId: null`). Tuvo que mockearse también el paquete `next-auth` (no solo `@/auth`) porque `actions.ts` importa `AuthError` directo de ahí, y cargar el paquete real rompía la resolución de módulos de Vitest (`next/server` no resuelve bien fuera de un runtime Next real).
- Playwright: `e2e/vendedores-login-flow.spec.ts` (crea tenant+sede+VENDEDOR vía superadmin/admin, login del VENDEDOR en `apps/vendedores` confirma su `sedeId`, y el `TENANT_ADMIN` del mismo tenant ve el mensaje de sin acceso al intentar entrar ahí) y `e2e/clientes-registro-flow.spec.ts` (registro público real, auto-login, `rol=CLIENTE`/sin sede). Dos fallos menores de locator ambiguo en el primer intento de cada spec (el texto del rol/email aparecía dos veces en la página — header + dashboard, o el "route announcer" de accesibilidad de Next.js) — resueltos acotando el selector (`{exact: true}`, `getByRole("heading", ...)`, `.getByRole("main").getByText(...)`), no bugs reales de la app.
- `next build` de producción de ambas apps (y `superadmin`/`admin`, para confirmar que nada se rompió) vía Turbo, verde.

## Estado de deploy — apps/vendedores y apps/clientes (2026-08-26)

Ambas desplegadas por primera vez, `● Ready`: revisar `vercel ls` en cada proyecto (`rifaxapp-vendedores`, `rifaxapp-clientes`) para las URLs exactas si hace falta.

## Próximo paso concreto

1. **Fase 5** (a definir con el usuario): las 4 apps y el login multi-rol ya están completos — el paso natural es diseñar `Rifa`/`Boleto`/`Venta`/`Cliente`/`Pago` en `packages/db-tenant` cuando el usuario defina las reglas de negocio (precios, métodos de pago, estados de una rifa, cómo se vende un boleto), y recién ahí construir las pantallas reales en cada app.
2. Dominio y wildcard `*.rifaxapp.com` / Multi Zones siguen pospuestos a pedido del usuario — cuando exista, solo hace falta setear `TENANT_BASE_DOMAIN=rifaxapp.com` en cada app de tenant, la lógica de resolución ya está lista para eso.
3. Decidir si se baja `typescript` a 6.x en todo el repo para que `npm run lint` vuelva a funcionar (preexistente, no bloqueante para desarrollar).

## Cierre de sesión — 2026-08-25 (noche)

Sesión pausada a pedido del usuario ("paremos acá y continuamos mañana"). No quedó nada a medias sin commitear — todo lo de esta sesión está pusheado a `main` (`1db1dc6`). Lo único pendiente es que el usuario responda las dos preguntas de arriba (Neon y dominio) para poder cerrar el gate de Fase 0. Quien retome: lee este archivo completo antes de tocar nada.

## Notas técnicas de arquitectura para quien retome

- Next.js 16.3.3 es muy reciente: leer `node_modules/next/dist/docs/` (dentro de cada app) antes de escribir routing/middleware/server actions — hay cambios de breaking respecto a versiones anteriores.
- Puertos de dev fijos por app: superadmin=3000, admin=3001, vendedores=3002, clientes=3003 (`npm run dev` a nivel raíz levanta los 4 en paralelo vía Turborepo).
- El plan completo de fases (0 a 7) con sus "gates" de pruebas está resumido en `docs/ARQUITECTURA.md`.
