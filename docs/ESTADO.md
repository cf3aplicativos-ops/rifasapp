# Estado del desarrollo — Rifaxapp

> Léeme primero al empezar cualquier sesión de trabajo (desde cualquier equipo/agente). Actualízame al final de cada sesión: qué se hizo, qué quedó a medias, decisiones tomadas y el próximo paso concreto.

## Última actualización

**2026-08-25** — sesión inicial (agente en escritorio).

## Fase actual

**Fase 0 — Fundación y tooling** (casi cerrada — falta Neon control-plane y dominio, ver pendientes abajo).

## Qué se completó en esta sesión

- Plan de acción completo aprobado por el usuario (decisiones clave: 1 DB por tenant en un mismo proyecto Neon, monorepo Turborepo con 4 apps separadas, ruteo por subdominio con Next.js Multi Zones, Auth.js con credenciales propias). Detalle en `docs/ARQUITECTURA.md` y `docs/DECISIONES.md`.
- `gh` CLI (2.98.0) y `vercel` CLI (59.5.0) instalados y **autenticados**: `gh` como `cf3aplicativos-ops`, `vercel` como `cf3aplicativos-9248` (team `rifa7`, org id `team_9E0DHiFoueL3qhER9yrUzafy`).
- Monorepo Turborepo scaffoldeado con npm workspaces. 4 apps Next.js 16.3.3 (`create-next-app`, TS + App Router + Tailwind + ESLint): `apps/superadmin` (3000), `apps/admin` (3001), `apps/vendedores` (3002), `apps/clientes` (3003). Paquetes `@rifaxapp/<app>`.
- `npm run build` verde para los 4 apps. Vitest + Playwright configurados a nivel raíz (sin specs reales aún, se agregan desde Fase 1/3).
- **Git**: repo inicializado, identidad `cf3aplicativos-ops` / `jaiguaranosorio@gmail.com`, push hecho a `main` en `cf3aplicativos-ops/rifasapp` (commits `7e7dea9`, `1759e3b`).
- **Vercel**: 4 proyectos creados (`rifaxapp-superadmin`, `rifaxapp-admin`, `rifaxapp-vendedores`, `rifaxapp-clientes`) bajo el team `rifa7`, cada uno con `Root Directory` apuntando a su carpeta (`apps/<app>`), conectados al repo de GitHub (`vercel git connect`, sin necesidad de instalar nada extra manualmente — el CLI maneja la conexión). Push a `main` ya dispara build+deploy automático en los 4 — verificado en verde (status `Ready`) para el commit `1759e3b`.
- Deploys de producción quedan detrás del **Deployment Protection** por defecto de Vercel para proyectos de equipo (redirige a login de Vercel) — es el comportamiento esperado, no un error. Para verlos hay que estar logueado en el dashboard de Vercel con la cuenta del team `rifa7`.

## Pendiente (Fase 0, para cerrar el gate completo)

1. **Proyecto Neon "control-plane"** — aún no creado. Opciones: (a) integración nativa Neon–Vercel desde el dashboard del proyecto `rifaxapp-superadmin` (requiere aprobación del usuario, es una instalación de integración/OAuth-like), o (b) crear cuenta/proyecto directo en Neon y pasar el connection string como env var a mano. **Falta decidir con el usuario.**
2. **Dominio `rifaxapp.com`** — no confirmado si ya está comprado y en qué proveedor DNS. Se necesita para el wildcard `*.rifaxapp.com` en Vercel y las rewrites de Multi Zones (`/admin/**`, `/vendedores/**`). Sin esto los 4 apps solo son accesibles por sus URLs `*.vercel.app` individuales (protegidas por Vercel), que sirven para probar builds pero no para el ruteo multi-tenant real.
3. Confirmar con el usuario si el nombre/email de git (`cf3aplicativos-ops` / `jaiguaranosorio@gmail.com`) es el definitivo — no hubo objeción hasta ahora.

## Notas operativas para quien retome (importante — fricción real que ya se resolvió una vez)

- En esta máquina Windows, las herramientas instaladas por fuera de una sesión de terminal (via `winget`/`npm -g` corridas por un agente) **no aparecen en el PATH de una terminal ya abierta**, ni siquiera abriendo una pestaña "nueva" dentro de la misma app de terminal (hereda el entorno del proceso padre). Fix rápido dentro de la sesión actual sin reiniciar nada:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```
- Además, la política de ejecución de PowerShell en esta máquina bloquea los shims `.ps1` de npm (`npm.ps1`, `vercel.ps1` etc.) con `UnauthorizedAccess`. Workaround sin tocar la política de seguridad del sistema: anteponer `cmd /c` al comando, ej. `cmd /c "npm install -g vercel"`, `cmd /c vercel login`.
- El login interactivo de `vercel login` (device code por navegador) falló repetidamente ("Couldn't verify the code") pese a hacerlo bien — parece un problema del lado de Vercel/latencia, no del usuario. Se resolvió generando un **Personal Access Token** en vercel.com/account/tokens y usándolo con `--token` en cada comando del CLI (o `$env:VERCEL_TOKEN`). Si vuelve a pasar, saltar directo a esta vía en lugar de reintentar el device code.
- El token de Vercel usado en esta sesión fue pegado por el usuario directamente en el chat — **no quedó guardado en ningún archivo del repo** (se usó solo como variable de entorno/flag en comandos puntuales). Si se quiere evitar tenerlo en el historial del chat, se puede rotar/revocar desde vercel.com/account/tokens y generar uno nuevo para la siguiente sesión.

## Próximo paso concreto

1. Decidir con el usuario cómo crear el proyecto Neon "control-plane" (integración Vercel–Neon vs. cuenta Neon directa) y confirmar estado del dominio `rifaxapp.com`.
2. Con eso resuelto: configurar el wildcard `*.rifaxapp.com` en Vercel + rewrites de Multi Zones, cerrar el gate de Fase 0.
3. Pasar a Fase 1: `packages/db-control` (schema Prisma `Tenant`/`SuperAdminUser`) + `apps/superadmin` (login superadmin, CRUD de tenants, provisioning). Con pruebas (unit del servicio de provisioning + Playwright del flujo crear-tenant) antes de cerrar la fase.

## Notas técnicas de arquitectura para quien retome

- Next.js 16.3.3 es muy reciente: leer `node_modules/next/dist/docs/` (dentro de cada app) antes de escribir routing/middleware/server actions — hay cambios de breaking respecto a versiones anteriores.
- Puertos de dev fijos por app: superadmin=3000, admin=3001, vendedores=3002, clientes=3003 (`npm run dev` a nivel raíz levanta los 4 en paralelo vía Turborepo).
- El plan completo de fases (0 a 7) con sus "gates" de pruebas está resumido en `docs/ARQUITECTURA.md`.
