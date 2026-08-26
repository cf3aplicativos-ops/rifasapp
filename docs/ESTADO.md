# Estado del desarrollo — Rifaxapp

> Léeme primero al empezar cualquier sesión de trabajo (desde cualquier equipo/agente). Actualízame al final de cada sesión: qué se hizo, qué quedó a medias, decisiones tomadas y el próximo paso concreto.

## Última actualización

**2026-08-25** — sesión inicial (agente en escritorio).

## Fase actual

**Fase 0 — Fundación y tooling** (en progreso).

## Qué se completó en esta sesión

- Plan de acción completo aprobado por el usuario (ver `docs/ARQUITECTURA.md` y `docs/DECISIONES.md` para el resumen; decisiones clave: 1 DB por tenant en un mismo proyecto Neon, monorepo Turborepo con 4 apps separadas, ruteo por subdominio con Next.js Multi Zones, Auth.js con credenciales propias).
- Instalado `gh` CLI (2.98.0) y `vercel` CLI (59.5.0) en esta máquina (Windows, vía winget y npm respectivamente).
- `git init` en `C:\projectos\rifaxapp`, identidad configurada (`cf3aplicativos-ops` / `jaiguaranosorio@gmail.com` — **confirmar con el usuario si prefiere otro nombre**).
- Monorepo Turborepo scaffoldeado (`create-turbo@latest`) con npm workspaces.
- 4 apps Next.js 16.3.3 creadas con `create-next-app` (TypeScript, App Router, Tailwind, ESLint): `apps/superadmin` (puerto 3000), `apps/admin` (3001), `apps/vendedores` (3002), `apps/clientes` (3003). Nombres de paquete `@rifaxapp/<app>`.
- `npm install` en la raíz corrido correctamente (workspaces linkeados), `npm run build` verificado en verde para los 4 apps (build de Turborepo, "4 successful, 4 total").
- Vitest y Playwright instalados y configurados a nivel raíz (`vitest.config.ts`, `playwright.config.ts`, scripts `npm test` / `npm run test:e2e`). Aún sin specs reales (se agregan desde Fase 1/3).
- `docs/ARQUITECTURA.md` y `docs/DECISIONES.md` creados.
- **Todavía no se ha hecho commit ni push** (ver bloqueos abajo).

## Bloqueos / pendiente de acción del usuario (no delegable a un agente)

Estos pasos requieren login interactivo (browser/device code) con las credenciales reales del usuario/organización — un agente no los puede completar por su cuenta:

1. **`gh auth login`** — el usuario debe correrlo en su propia terminal (recomendado `gh auth login --web`) para poder hacer push/gestionar el repo `cf3aplicativos-ops/rifasapp` vía `gh`.
2. **`vercel login`** — idem, requiere confirmar por correo/browser.
3. **Cuenta/organización Neon** — aún no se ha creado el proyecto Neon "control-plane". Se planea crearlo vía la integración nativa Neon–Vercel en el proyecto `superadmin` (auto-inyecta el connection string), lo que requiere que el proyecto Vercel ya exista y el usuario apruebe la integración desde el dashboard.
4. **Instalar la Vercel GitHub App** en el repo/organización — requiere aprobación explícita del usuario en GitHub (permiso OAuth-like), no se puede automatizar.
5. **Dominio `rifaxapp.com`** — confirmar si ya está comprado/en qué proveedor DNS está, para configurar el wildcard `*.rifaxapp.com` en Vercel.

## Próximo paso concreto

1. Usuario corre `gh auth login` y `vercel login` en su máquina (o confirma que ya lo hizo en esta).
2. Con `gh` autenticado: `git add`, primer commit, `git remote add origin https://github.com/cf3aplicativos-ops/rifasapp.git`, push a `main`.
3. Con `vercel` autenticado: crear los 4 proyectos Vercel (uno por carpeta `apps/*`), conectarlos al repo de GitHub, instalar la Vercel GitHub App (usuario confirma/aprueba).
4. Crear el proyecto Neon "control-plane" (vía integración Vercel–Neon en `apps/superadmin` o directamente en el dashboard de Neon) y guardar el connection string como env var en Vercel.
5. Confirmar estado/DNS del dominio `rifaxapp.com` y configurar el wildcard en Vercel + las rewrites de Multi Zones.
6. Cerrar el gate de Fase 0 (deploy preview visible en las 4 URLs de Vercel) y pasar a Fase 1 (`packages/db-control` + `apps/superadmin`: CRUD de tenants y provisioning).

## Notas técnicas para quien retome

- Next.js 16.3.3 es muy reciente: leer `node_modules/next/dist/docs/` (dentro de cada app) antes de escribir routing/middleware/server actions — hay cambios de breaking respecto a versiones anteriores.
- Puertos de dev fijos por app: superadmin=3000, admin=3001, vendedores=3002, clientes=3003 (`npm run dev` a nivel raíz levanta los 4 en paralelo vía Turborepo).
- El plan completo de fases (0 a 7) con sus "gates" de pruebas está resumido en `docs/ARQUITECTURA.md`; el detalle narrativo completo quedó en el plan aprobado de la sesión del 2026-08-25.
