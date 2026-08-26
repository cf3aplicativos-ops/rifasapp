# E2E tests (Playwright)

Pruebas end-to-end multi-app. Cada archivo `*.spec.ts` corre contra los `baseURL` definidos en `playwright.config.ts` (uno por app, puertos 3000-3003).

Antes de correr `npm run test:e2e` por primera vez en una máquina nueva:

```bash
npx playwright install
```

Aún no hay specs reales: se agregan a partir de la Fase 1 (flujo de creación de tenant) y Fase 3 (login multi-rol y aislamiento por sede/tenant), según el plan en `docs/ARQUITECTURA.md`.
