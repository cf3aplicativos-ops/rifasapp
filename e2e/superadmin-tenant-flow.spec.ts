import { test, expect } from "@playwright/test";

// Corre contra el proyecto "superadmin" (puerto 3000): `npx playwright test --project=superadmin`.
// Requiere el dev server de apps/superadmin corriendo y un SuperAdmin ya seedeado
// (ver packages/db-control/prisma/seed.ts) con las credenciales abajo.
const EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("superadmin: flujo de creación de tenant", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("login, crear tenant, queda ACTIVO, y se puede borrar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL!);
    await page.getByLabel("Contraseña").fill(PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-${Date.now()}`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Test Tenant");
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Borrar" }).click();

    await expect(page.getByText(slug)).not.toBeVisible();
  });
});
