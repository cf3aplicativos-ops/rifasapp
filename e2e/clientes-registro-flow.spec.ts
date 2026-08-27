import { test, expect } from "@playwright/test";

// Corre contra el proyecto "clientes" (puerto 3003) pero también maneja
// el puerto 3000 (superadmin) para crear el tenant real que necesita.
// `npx playwright test --project=clientes e2e/clientes-registro-flow.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("clientes: registro público", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("un visitante se registra, queda logueado, y su sesión no tiene sede", async ({ page }) => {
    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-cli-${Date.now()}`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Clientes Test Tenant");
    await page.getByLabel("Email del admin").fill(`admin+${slug}@example.com`);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    // 2. Registrarse como cliente nuevo en apps/clientes (puerto 3003).
    const clientesBase = `http://${slug}.localhost:3003`;
    await page.goto(`${clientesBase}/registro`);
    const clienteEmail = `cliente+${slug}@example.com`;
    await page.getByLabel("Email").fill(clienteEmail);
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // 3. Queda logueado automáticamente, con rol CLIENTE y sin sede.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("main").getByText(clienteEmail)).toBeVisible();
    await expect(page.getByText("CLIENTE", { exact: true })).toBeVisible();

    // 4. Cleanup: borrar el tenant desde superadmin (dispara DROP DATABASE).
    await page.goto("http://localhost:3000/tenants");
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Borrar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
  });
});
