import { test, expect } from "@playwright/test";
import { Client } from "pg";

// Corre contra el proyecto "superadmin" (puerto 3000): `npx playwright test --project=superadmin`.
// Requiere el dev server de apps/superadmin corriendo, un SuperAdmin ya seedeado
// (ver packages/db-control/prisma/seed.ts) y las env vars TENANTS_HOST_* (para
// conectarse directo a la DB del tenant recién creado y verificar el TENANT_ADMIN).
const EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;
const TENANTS_HOST_PGHOST = process.env.TENANTS_HOST_PGHOST;
const TENANTS_HOST_PGUSER = process.env.TENANTS_HOST_PGUSER;
const TENANTS_HOST_PGPASSWORD = process.env.TENANTS_HOST_PGPASSWORD;

test.describe("superadmin: flujo de creación de tenant", () => {
  test.skip(
    !EMAIL || !PASSWORD || !TENANTS_HOST_PGHOST || !TENANTS_HOST_PGUSER || !TENANTS_HOST_PGPASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL, SUPERADMIN_SEED_PASSWORD y TENANTS_HOST_PGHOST/PGUSER/PGPASSWORD para correr este spec",
  );

  test("login, crear tenant con admin, queda ACTIVO con su TENANT_ADMIN real, y se puede borrar", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL!);
    await page.getByLabel("Contraseña").fill(PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-${Date.now()}`;
    const adminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Test Tenant");
    await page.getByLabel("Email del admin").fill(adminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    // El banner de credenciales muestra el email del admin recién creado.
    await expect(page.getByText(adminEmail)).toBeVisible();

    // Verificación real: la DB del tenant existe y tiene su TENANT_ADMIN.
    const dbName = `tenant_${slug.replace(/-/g, "_")}`;
    const tenantDb = new Client({
      connectionString: `postgresql://${TENANTS_HOST_PGUSER}:${TENANTS_HOST_PGPASSWORD}@${TENANTS_HOST_PGHOST}/${dbName}?sslmode=require`,
    });
    await tenantDb.connect();
    try {
      const result = await tenantDb.query('SELECT email, rol FROM "Usuario" WHERE email = $1', [adminEmail]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].rol).toBe("TENANT_ADMIN");
    } finally {
      await tenantDb.end();
    }

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Borrar" }).click();

    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
  });
});
