import { test, expect } from "@playwright/test";

// Flujo de negocio completo de Fase 5, cruzando las 3 apps de tenant — real
// contra Neon, sin mocks (mismo estilo que el resto de e2e/).
// `npx playwright test e2e/rifa-flujo-completo.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("rifa: flujo completo (admin crea/activa, vendedor y cliente compran, admin confirma y cierra)", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("rifa de punta a punta", async ({ page }) => {
    // Flujo largo (crea tenant + sede + usuario + rifa + 2 compras cruzando
    // 3 apps) — el timeout default de Playwright (30s) no alcanza.
    test.setTimeout(120_000);

    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-rifa-${Date.now()}`;
    const tenantAdminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Rifa Test Tenant");
    await page.getByLabel("Email del admin").fill(tenantAdminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    const tenantAdminPasswordText = await page.getByText(/^Password: /).textContent();
    const tenantAdminPassword = tenantAdminPasswordText!.replace("Password: ", "").trim();

    // 2. TENANT_ADMIN en admin (puerto 3001): crea sede + invita un VENDEDOR.
    const adminBase = `http://${slug}.localhost:3001`;
    await page.goto(`${adminBase}/login`);
    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${adminBase}/sedes`);
    await page.getByLabel("Nombre de la sede").fill("Sede Rifa");
    await page.getByRole("button", { name: "Crear sede" }).click();
    await expect(page.getByText("Sede Rifa")).toBeVisible();

    await page.goto(`${adminBase}/usuarios`);
    const vendedorEmail = `vendedor+${slug}@example.com`;
    await page.getByLabel("Email").fill(vendedorEmail);
    await page.getByLabel("Rol").selectOption("VENDEDOR");
    await page.getByLabel("Sede").selectOption({ label: "Sede Rifa" });
    await page.getByRole("button", { name: "Invitar usuario" }).click();
    const vendedorPasswordText = await page.getByText(/^Password: /).textContent();
    const vendedorPassword = vendedorPasswordText!.replace("Password: ", "").trim();

    // 3. TENANT_ADMIN crea la rifa (BORRADOR) y la activa.
    await page.goto(`${adminBase}/rifas`);
    await page.getByLabel("Nombre").fill("Rifa moto");
    await page.getByLabel("Precio del boleto").fill("10");
    await page.getByLabel("Cantidad de boletos").fill("5");
    await page.getByRole("button", { name: "Crear rifa" }).click();

    const rifaRow = page.getByRole("row", { name: /Rifa moto/ });
    await expect(rifaRow).toBeVisible({ timeout: 10000 });
    await rifaRow.getByRole("button", { name: "Activar" }).click();
    await expect(rifaRow).toContainText("Activa", { timeout: 15000 });

    // 4. VENDEDOR en vendedores (puerto 3002): vende el boleto #1 en persona.
    const vendedoresBase = `http://${slug}.localhost:3002`;
    await page.goto(`${vendedoresBase}/login`);
    await page.getByLabel("Email").fill(vendedorEmail);
    await page.getByLabel("Contraseña").fill(vendedorPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${vendedoresBase}/rifas`);
    await page.getByRole("link", { name: "Rifa moto" }).click();
    await expect(page).toHaveURL(/\/rifas\//);

    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByLabel("Nombre del comprador").fill("Cliente Presencial");
    await page.getByRole("button", { name: "Registrar venta" }).click();
    await expect(page.getByText("Seleccionados: ninguno")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled({ timeout: 15000 });

    // 5. Un CLIENTE nuevo se registra en clientes (puerto 3003) y reserva el
    // boleto #2 (queda PENDIENTE — no hay pasarela, se confirma a mano).
    const clientesBase = `http://${slug}.localhost:3003`;
    const clienteEmail = `cliente+${slug}@example.com`;
    await page.goto(`${clientesBase}/registro`);
    await page.getByLabel("Email").fill(clienteEmail);
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${clientesBase}/rifas`);
    await page.getByRole("link", { name: "Rifa moto" }).click();
    await expect(page).toHaveURL(/\/rifas\//);

    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "Reservar boletos" }).click();
    await expect(page.getByText("Seleccionados: ninguno")).toBeVisible({ timeout: 15000 });

    await page.goto(`${clientesBase}/mis-boletos`);
    await expect(page.getByText("#2")).toBeVisible();
    await expect(page.getByText("Pendiente de confirmación")).toBeVisible();

    // 6. TENANT_ADMIN revisa las ventas: confirma el pago pendiente del cliente.
    await page.goto(`${adminBase}/rifas`);
    await page.getByRole("link", { name: "Rifa moto" }).click();
    await page.getByRole("link", { name: "Ver ventas" }).click();
    await expect(page).toHaveURL(/\/ventas$/);

    // clienteEmail contiene un "+" (regex especial) — pasar el string
    // directo hace un substring match, no falla como new RegExp(clienteEmail).
    const ventaPendienteRow = page.getByRole("row", { name: clienteEmail });
    await expect(ventaPendienteRow).toContainText("Pendiente");
    await ventaPendienteRow.getByRole("button", { name: "Confirmar pago" }).click();
    await expect(ventaPendienteRow).toContainText("Pagada", { timeout: 15000 });

    // 7. TENANT_ADMIN cierra la rifa eligiendo el boleto #1 como ganador.
    await page.goBack();
    await expect(page).toHaveURL(/\/rifas\/[^/]+$/);
    await page.getByLabel("Número de boleto ganador").fill("1");
    await page.getByRole("button", { name: "Cerrar rifa y elegir ganador" }).click();
    await expect(page.getByText("Boleto ganador: #1")).toBeVisible({ timeout: 15000 });

    // 8. TENANT_ADMIN revisa /reportes: recaudado total y desglose por vendedor.
    await page.goto(`${adminBase}/reportes`);
    await expect(page.getByText("$20.00").first()).toBeVisible();
    const rifaReportSection = page.locator("section", { hasText: "Rifa moto" });
    await expect(rifaReportSection).toContainText("$20.00");
    await expect(rifaReportSection.getByRole("row", { name: vendedorEmail })).toContainText("$10.00");
    await expect(rifaReportSection.getByRole("row", { name: "Autocompra" })).toContainText("$10.00");

    // 9. Cleanup: borrar el tenant desde superadmin (dispara DROP DATABASE).
    await page.goto("http://localhost:3000/tenants");
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Borrar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
  });
});
