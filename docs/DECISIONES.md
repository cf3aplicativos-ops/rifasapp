# Decisiones técnicas (ADR corto)

Registro de decisiones relevantes y su motivo. Formato: fecha, decisión, motivo, alternativas descartadas.

## 2026-08-25 — Aislamiento de datos: 1 DB por tenant, mismo proyecto Neon

**Decisión**: cada tenant tiene su propia base de datos Postgres (`CREATE DATABASE`), pero todas viven dentro de un mismo proyecto Neon (comparten compute/facturación).

**Motivo**: da aislamiento real de datos (requisito explícito del usuario: "bases de datos independientes") sin chocar con los límites de "número de proyectos" de los planes de Neon, que sí limitan cuántos *proyectos* Neon se pueden tener pero no tanto cuántas *bases de datos* dentro de un proyecto. Es el patrón que Neon documenta para SaaS con muchos tenants.

**Alternativas descartadas**:
- 1 proyecto Neon por tenant (máximo aislamiento, pero no escala en costo/gestión de límites de plan).
- 1 schema por tenant en una sola DB (más económico pero aislamiento débil, no calza con el requisito).

## 2026-08-25 — Monorepo Turborepo con 4 apps Next.js separadas

**Decisión**: `apps/superadmin`, `apps/admin`, `apps/vendedores`, `apps/clientes` como apps Next.js independientes en un monorepo Turborepo/npm workspaces, en vez de una sola app con rutas por rol.

**Motivo**: elegido explícitamente por el usuario sobre la alternativa recomendada (app única) — prioriza poder desplegar/escalar cada portal de forma independiente a futuro, a costa de más complejidad inicial de configuración (4 proyectos Vercel, ruteo multi-zona).

## 2026-08-25 — Ruteo por subdominio + Next.js Multi Zones

**Decisión**: `{tenant}.rifaxapp.com` servido por `apps/clientes`, con `/admin/**` y `/vendedores/**` reenviados por rewrites a los otros deployments de Vercel (patrón "Multi Zones").

**Motivo**: subdominios anidados (`admin.{tenant}.rifaxapp.com`) no funcionan bien con un wildcard DNS de un solo nivel; Multi Zones permite mantener 4 apps Vercel separadas bajo un único dominio público por tenant.

## 2026-08-25 — Auth.js (NextAuth) con credenciales propias, no Clerk

**Decisión**: autenticación propia con Auth.js, resolviendo el tenant primero (por subdominio) y validando credenciales contra la DB de ese tenant específico.

**Motivo**: los usuarios (vendedores, clientes, admins) viven en la base de datos independiente de cada tenant; un proveedor de identidad centralizado externo (Clerk) no calza naturalmente con ese modelo y añade una dependencia de pago externa.

## 2026-08-25 — Next.js 16.3.3

**Nota (no decisión activa)**: `create-next-app@latest` instaló Next 16.3.3, versión reciente con cambios de breaking respecto al conocimiento previo del asistente. Antes de escribir código de routing/middleware/server actions, revisar `node_modules/next/dist/docs/` dentro de la app correspondiente.
