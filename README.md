# Rifaxapp

SaaS multi-tenant de rifas, multi-sede por tenant. Monorepo Turborepo (npm workspaces).

- `docs/ESTADO.md` — estado vivo del desarrollo, léelo primero en cada sesión.
- `docs/ARQUITECTURA.md` — arquitectura del sistema.
- `docs/DECISIONES.md` — decisiones técnicas y su motivo.

## Apps

| App | Puerto dev | Descripción |
|---|---|---|
| `apps/superadmin` | 3000 | Gestión de tenants (nosotros, el SaaS) |
| `apps/admin` | 3001 | Dashboard admin de tenant/sede |
| `apps/vendedores` | 3002 | Portal de vendedores (scoped a su sede) |
| `apps/clientes` | 3003 | Portal de clientes (scoped a su tenant) |

## Comandos

```sh
npm install       # instala dependencias de todo el workspace
npm run dev        # levanta los 4 apps en paralelo (Turborepo)
npm run build       # build de todos los apps y packages
npm test            # unit tests (Vitest)
npm run test:e2e     # e2e (Playwright) — requiere `npx playwright install` la primera vez
```
