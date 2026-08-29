import { test, expect } from "@playwright/test";

// Fase 19B: asignar un boleto a un vendedor → otro vendedor no puede
// venderlo → lo pide prestado → el dueño lo acepta → el que lo pidió ya
// puede venderlo. Corre contra los 4 dev servers reales (sin mocks), igual
// estilo que rifa-flujo-completo.spec.ts.
// `npx playwright test --project=superadmin e2e/boleto-asignacion-traspaso-flow.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

test.describe("asignación + traspaso de boletos", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("asignar a un vendedor, bloquear la venta del otro, pedir prestado, aceptar, vender", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-traspaso-${Date.now()}`;
    const tenantAdminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Traspaso Test Tenant");
    await page.getByLabel("Email del admin").fill(tenantAdminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    const tenantAdminPasswordText = await page.getByText(/^Password: /).textContent();
    const tenantAdminPassword = tenantAdminPasswordText!.replace("Password: ", "").trim();

    // 2. TENANT_ADMIN en admin (puerto 3001): sede + 2 vendedores + rifa.
    const adminBase = `http://${slug}.localhost:3001/admin`;
    await page.goto(`${adminBase}/login`);
    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${adminBase}/sedes`);
    await page.getByLabel("Nombre de la sede").fill("Sede Traspaso");
    await page.getByRole("button", { name: "Crear sede" }).click();
    await expect(page.getByText("Sede Traspaso")).toBeVisible();

    await page.goto(`${adminBase}/usuarios`);
    const vendedor1Email = `vendedor1+${slug}@example.com`;
    await page.getByLabel("Email").fill(vendedor1Email);
    await page.getByLabel("Rol").selectOption("VENDEDOR");
    await page.getByLabel("Sede").selectOption({ label: "Sede Traspaso" });
    await page.getByRole("button", { name: "Invitar usuario" }).click();
    const vendedor1PasswordText = await page.getByText(/^Password: /).textContent();
    const vendedor1Password = vendedor1PasswordText!.replace("Password: ", "").trim();

    // Recargar antes del segundo invite: si no, el banner de credenciales de
    // vendedor1 sigue en pantalla y el getByText de abajo puede resolverse
    // contra ESE texto viejo antes de que la Server Action de vendedor2
    // termine y lo reemplace (mismo elemento, no hay nada "nuevo" que
    // esperar) — con la recarga, el banner arranca ausente y Playwright sí
    // espera a que aparezca el de verdad.
    await page.goto(`${adminBase}/usuarios`);
    const vendedor2Email = `vendedor2+${slug}@example.com`;
    await page.getByLabel("Email").fill(vendedor2Email);
    await page.getByLabel("Rol").selectOption("VENDEDOR");
    await page.getByLabel("Sede").selectOption({ label: "Sede Traspaso" });
    await page.getByRole("button", { name: "Invitar usuario" }).click();
    const vendedor2PasswordText = await page.getByText(/^Password: /).textContent();
    const vendedor2Password = vendedor2PasswordText!.replace("Password: ", "").trim();

    await page.goto(`${adminBase}/rifas`);
    await page.getByLabel("Nombre").fill("Rifa traspaso");
    await page.getByLabel("Precio del boleto").fill("10");
    await page.getByLabel("Cantidad de boletos").fill("5");
    await page.getByRole("button", { name: "Crear rifa" }).click();

    const rifaRow = page.getByRole("row", { name: /Rifa traspaso/ });
    await expect(rifaRow).toBeVisible({ timeout: 10000 });
    await rifaRow.getByRole("button", { name: "Activar" }).click();
    await expect(rifaRow).toContainText("Activa", { timeout: 15000 });
    await rifaRow.getByRole("link", { name: "Rifa traspaso" }).click();
    await expect(page).toHaveURL(/\/rifas\/[^/]+$/);
    const rifaId = new URL(page.url()).pathname.split("/").pop()!;

    // 3. Asignarle el boleto #1 a vendedor1 (modo consecutivo, cantidad 1 =
    // siempre el número libre más bajo).
    await page.getByRole("link", { name: "Asignación de boletos" }).click();
    await expect(page).toHaveURL(/\/asignaciones$/);
    await page.getByLabel("Asignar a").selectOption({ label: vendedor1Email });
    await page.getByLabel("Cantidad").fill("1");
    await page.getByRole("button", { name: "Asignar" }).click();
    await expect(page.getByText("Asignados: 1")).toBeVisible({ timeout: 10000 });

    // 4. VENDEDOR2 en vendedores (puerto 3002): el #1 le queda deshabilitado.
    const vendedoresBase = `http://${slug}.localhost:3002/vendedores`;
    await page.goto(`${vendedoresBase}/login`);
    await page.getByLabel("Email").fill(vendedor2Email);
    await page.getByLabel("Contraseña").fill(vendedor2Password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${vendedoresBase}/rifas`);
    await page.getByRole("link", { name: "Rifa traspaso" }).click();
    await expect(page).toHaveURL(/\/rifas\//);
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();

    // 5. Consulta el #1: ve que lo tiene otro vendedor, y lo pide prestado.
    await page.getByLabel("Número").fill("1");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("Lo tiene otro vendedor")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(vendedor1Email)).toBeVisible();
    await page.getByRole("button", { name: "Pedir prestado" }).click();
    await expect(page.getByText(/Solicitud enviada/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login/);

    // 6. VENDEDOR1 ve el pedido en /traspasos y lo acepta.
    await page.getByLabel("Email").fill(vendedor1Email);
    await page.getByLabel("Contraseña").fill(vendedor1Password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${vendedoresBase}/traspasos`);
    // vendedor2Email tiene un "+" (regex especial) — pasar el string directo
    // hace un substring match, no falla como new RegExp(vendedor2Email).
    const solicitudRow = page.getByRole("row", { name: vendedor2Email });
    await expect(solicitudRow).toBeVisible({ timeout: 10000 });
    await solicitudRow.getByRole("button", { name: "Aceptar" }).click();
    // El texto de vendedor2Email también aparece (oculto) adentro del
    // <dialog> de rechazo de esta misma fila — acotar a la fila de la
    // tabla evita el "strict mode violation" de un getByText genérico.
    await expect(page.getByRole("row", { name: vendedor2Email })).toHaveCount(0, {
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login/);

    // 7. VENDEDOR2 ya puede vender el #1.
    await page.getByLabel("Email").fill(vendedor2Email);
    await page.getByLabel("Contraseña").fill(vendedor2Password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${vendedoresBase}/rifas/${rifaId}`);
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeEnabled({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByLabel("Nombre del comprador").fill("Cliente Traspaso");
    await page.getByRole("button", { name: "Registrar venta" }).click();
    await expect(page.getByText("Seleccionados: ninguno")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled({
      timeout: 15000,
    });

    // 8. Cleanup: borrar el tenant desde superadmin.
    await page.goto("http://localhost:3000/tenants");
    await row.getByRole("button", { name: "Borrar" }).click();
    await row.getByRole("checkbox").check();
    await row.locator("#confirmSlug").fill(slug);
    await row.getByRole("button", { name: "Borrar definitivamente" }).click();
    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
  });
});
