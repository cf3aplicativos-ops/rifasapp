import { test, expect } from "@playwright/test";

// Corre contra el proyecto "vendedores" (puerto 3002) pero también maneja
// los puertos 3000 (superadmin) y 3001 (admin) para crear el tenant, la
// sede y el VENDEDOR reales que necesita — reusa esos flujos ya probados
// en vez de duplicar la lógica de provisioning/invite acá.
// `npx playwright test --project=vendedores e2e/vendedores-login-flow.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("vendedores: login por rol", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("un VENDEDOR entra y ve su sedeId; un TENANT_ADMIN ve el mensaje de sin acceso", async ({
    page,
  }) => {
    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-vend-${Date.now()}`;
    const tenantAdminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Vendedores Test Tenant");
    await page.getByLabel("Email del admin").fill(tenantAdminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    const tenantAdminPasswordText = await page
      .getByText(/^Password: /)
      .textContent();
    const tenantAdminPassword = tenantAdminPasswordText!
      .replace("Password: ", "")
      .trim();

    // 2. Login como TENANT_ADMIN en admin (puerto 3001), crear sede + invitar VENDEDOR.
    // Fase 13 (Multi Zones): apps/admin sirve todo bajo basePath "/admin".
    const adminBase = `http://${slug}.localhost:3001/admin`;
    await page.goto(`${adminBase}/login`);
    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${adminBase}/sedes`);
    await page.getByLabel("Nombre de la sede").fill("Sede Vendedores");
    await page.getByRole("button", { name: "Crear sede" }).click();
    await expect(page.getByText("Sede Vendedores")).toBeVisible();

    await page.goto(`${adminBase}/usuarios`);
    const vendedorEmail = `vendedor+${slug}@example.com`;
    await page.getByLabel("Email").fill(vendedorEmail);
    await page.getByLabel("Rol").selectOption("VENDEDOR");
    await page.getByLabel("Sede").selectOption({ label: "Sede Vendedores" });
    await page.getByRole("button", { name: "Invitar usuario" }).click();

    const vendedorPasswordText = await page
      .getByText(/^Password: /)
      .textContent();
    const vendedorPassword = vendedorPasswordText!
      .replace("Password: ", "")
      .trim();

    // 3. Login como ese VENDEDOR en apps/vendedores (puerto 3002).
    // Fase 13 (Multi Zones): apps/vendedores sirve todo bajo basePath "/vendedores".
    const vendedoresBase = `http://${slug}.localhost:3002/vendedores`;
    await page.goto(`${vendedoresBase}/login`);
    await page.getByLabel("Email").fill(vendedorEmail);
    await page.getByLabel("Contraseña").fill(vendedorPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.getByText("VENDEDOR", { exact: true })).toBeVisible();
    // El sedeId visible no debe ser el guión de "sin sede".
    const sedeIdCell = page
      .locator("dd")
      .filter({ hasText: /^(?!—$).+/ })
      .last();
    await expect(sedeIdCell).toBeVisible();

    // 4. El TENANT_ADMIN del mismo tenant NO puede usar este portal.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(
      page.getByRole("heading", { name: "Sin acceso a este portal" }),
    ).toBeVisible();

    // 5. Cleanup: borrar el tenant desde superadmin (dispara DROP DATABASE).
    await page.goto("http://localhost:3000/tenants");
    await row.getByRole("button", { name: "Borrar" }).click();
    await row.getByRole("checkbox").check();
    await row.locator("#confirmSlug").fill(slug);
    await row.getByRole("button", { name: "Borrar definitivamente" }).click();
    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(
      0,
    );
  });
});
