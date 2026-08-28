import { test, expect } from "@playwright/test";

// Corre contra el proyecto "admin" (puerto 3001) pero también maneja el
// puerto 3000 (superadmin) para crear el tenant real que necesita —
// reusa el flujo YA probado de e2e/superadmin-tenant-flow.spec.ts en vez de
// duplicar la lógica de provisioning acá.
// `npx playwright test --project=admin e2e/admin-tenant-rbac-flow.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("admin: login multi-rol y RBAC por sede", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("TENANT_ADMIN crea sede + invita SEDE_ADMIN, y ese usuario ve su propio sedeId", async ({
    page,
  }) => {
    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-admin-${Date.now()}`;
    const tenantAdminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Admin Test Tenant");
    await page.getByLabel("Email del admin").fill(tenantAdminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    const passwordText = await page.getByText(/^Password: /).textContent();
    const tenantAdminPassword = passwordText!.replace("Password: ", "").trim();

    // 2. Login como TENANT_ADMIN en el subdominio del tenant (puerto 3001).
    // Fase 13 (Multi Zones): apps/admin sirve todo bajo basePath "/admin".
    const adminBase = `http://${slug}.localhost:3001/admin`;
    await page.goto(`${adminBase}/login`);
    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    // Acotado a "main": desde Fase 12 el sidebar también muestra el rol
    // (`session.user.rol` como sublabel), así que el texto sin acotar
    // matchea dos veces (sidebar + contenido del dashboard).
    await expect(
      page.getByRole("main").getByText("TENANT_ADMIN", { exact: true }),
    ).toBeVisible();

    // 3. Crear una Sede.
    await page.goto(`${adminBase}/sedes`);
    await page.getByLabel("Nombre de la sede").fill("Sede Centro");
    await page.getByRole("button", { name: "Crear sede" }).click();
    await expect(page.getByText("Sede Centro")).toBeVisible();

    // 4. Invitar un SEDE_ADMIN para esa sede.
    await page.goto(`${adminBase}/usuarios`);
    const sedeAdminEmail = `sede-admin+${slug}@example.com`;
    await page.getByLabel("Email").fill(sedeAdminEmail);
    await page.getByLabel("Rol").selectOption("SEDE_ADMIN");
    await page.getByLabel("Sede").selectOption({ label: "Sede Centro" });
    await page.getByRole("button", { name: "Invitar usuario" }).click();

    const sedeAdminPasswordText = await page
      .getByText(/^Password: /)
      .textContent();
    const sedeAdminPassword = sedeAdminPasswordText!
      .replace("Password: ", "")
      .trim();

    // 5. Logout, login como el SEDE_ADMIN recién creado.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(sedeAdminEmail);
    await page.getByLabel("Contraseña").fill(sedeAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 6. Verificar que la sesión trae el rol y sedeId correctos (no null,
    // a diferencia del TENANT_ADMIN) — la regla de RBAC de ARQUITECTURA.md.
    await expect(
      page.getByRole("main").getByText("SEDE_ADMIN", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("— (ve todas las sedes)")).not.toBeVisible();

    // El SEDE_ADMIN no tiene acceso a /sedes ni /usuarios (TENANT_ADMIN-only).
    await page.goto(`${adminBase}/sedes`);
    await expect(page).toHaveURL(/\/dashboard/);

    // 7. Cleanup: borrar el tenant desde superadmin (dispara DROP DATABASE).
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
