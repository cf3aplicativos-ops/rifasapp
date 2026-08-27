import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

// Flujo de pago con Wompi (Fase 8) — real contra Neon, sin mocks. No
// completa un pago de verdad en checkout.wompi.co (necesitaría tarjetas de
// prueba y llaves reales de sandbox del usuario): intercepta la navegación
// para verificar que el redirect/firma se arman bien, y simula el webhook
// de confirmación con un checksum válido calculado acá mismo — prueba la
// lógica de la app de punta a punta sin depender de que Wompi esté "vivo".
// `npx playwright test --project=clientes e2e/pago-wompi-flow.spec.ts`
const SUPERADMIN_SEED_EMAIL = process.env.SUPERADMIN_SEED_EMAIL;
const SUPERADMIN_SEED_PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

// Tiene que matchear WOMPI_EVENTS_SECRET en apps/clientes/.env.local — es
// un valor de prueba propio, no un secreto real de Wompi (ver docs/ESTADO.md).
const WOMPI_EVENTS_SECRET = "test_events_fd806ab6849b3cab8df7f9dc99f66884";

test.describe("pago con Wompi: reserva + redirect a checkout + webhook de confirmación", () => {
  test.skip(
    !SUPERADMIN_SEED_EMAIL || !SUPERADMIN_SEED_PASSWORD,
    "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD para correr este spec",
  );

  test("cliente paga con Wompi, el webhook confirma, el boleto queda VENDIDO", async ({ page }) => {
    test.setTimeout(90_000);

    // 1. Crear un tenant real vía superadmin (puerto 3000).
    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Email").fill(SUPERADMIN_SEED_EMAIL!);
    await page.getByLabel("Contraseña").fill(SUPERADMIN_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/tenants/);

    const slug = `e2e-wompi-${Date.now()}`;
    const tenantAdminEmail = `admin+${slug}@example.com`;
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Nombre").fill("E2E Wompi Test Tenant");
    await page.getByLabel("Email del admin").fill(tenantAdminEmail);
    await page.getByRole("button", { name: "Crear tenant" }).click();

    const row = page.getByRole("row", { name: new RegExp(slug) });
    await expect(row).toContainText("ACTIVO", { timeout: 20000 });

    const tenantAdminPasswordText = await page.getByText(/^Password: /).textContent();
    const tenantAdminPassword = tenantAdminPasswordText!.replace("Password: ", "").trim();

    // 2. TENANT_ADMIN crea y activa una rifa chica ($10 el boleto).
    const adminBase = `http://${slug}.localhost:3001`;
    await page.goto(`${adminBase}/login`);
    await page.getByLabel("Email").fill(tenantAdminEmail);
    await page.getByLabel("Contraseña").fill(tenantAdminPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${adminBase}/rifas`);
    await page.getByLabel("Nombre").fill("Rifa Wompi");
    await page.getByLabel("Precio del boleto").fill("10");
    await page.getByLabel("Cantidad de boletos").fill("3");
    await page.getByRole("button", { name: "Crear rifa" }).click();

    const rifaRow = page.getByRole("row", { name: /Rifa Wompi/ });
    await expect(rifaRow).toBeVisible({ timeout: 10000 });
    await rifaRow.getByRole("button", { name: "Activar" }).click();
    await expect(rifaRow).toContainText("Activa", { timeout: 15000 });

    // 3. Un CLIENTE nuevo se registra en clientes (puerto 3003).
    const clientesBase = `http://${slug}.localhost:3003`;
    const clienteEmail = `cliente+${slug}@example.com`;
    await page.goto(`${clientesBase}/registro`);
    await page.getByLabel("Email").fill(clienteEmail);
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`${clientesBase}/rifas`);
    await page.getByRole("link", { name: "Rifa Wompi" }).click();
    await expect(page).toHaveURL(/\/rifas\//);

    // 4. Selecciona el boleto #1 y clickea "Pagar ahora con Wompi" — se
    // intercepta la navegación para no pegarle al Wompi real.
    let capturedWompiUrl: string | undefined;
    await page.route("https://checkout.wompi.co/**", async (route) => {
      capturedWompiUrl = route.request().url();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<html>mock wompi checkout</html>" });
    });

    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "Pagar ahora con Wompi" }).click();
    await page.waitForURL(/checkout\.wompi\.co/, { timeout: 15000 });

    expect(capturedWompiUrl).toBeDefined();
    const wompiUrl = new URL(capturedWompiUrl!);
    expect(wompiUrl.origin + wompiUrl.pathname).toBe("https://checkout.wompi.co/p/");
    expect(wompiUrl.searchParams.get("amount-in-cents")).toBe("1000");
    expect(wompiUrl.searchParams.get("currency")).toBe("COP");
    expect(wompiUrl.searchParams.get("signature:integrity")).toBeTruthy();

    const reference = wompiUrl.searchParams.get("reference")!;
    const [tenantId, ventaId] = reference.split("--");
    expect(tenantId).toBeTruthy();
    expect(ventaId).toBeTruthy();

    // 5. Simular el webhook de Wompi confirmando el pago (APPROVED), con un
    // checksum válido calculado con el mismo algoritmo que la app.
    const timestamp = Math.floor(Date.now() / 1000);
    const transactionId = "e2e-test-txn-001";
    const status = "APPROVED";
    const checksum = createHash("sha256")
      .update(transactionId + status + timestamp + WOMPI_EVENTS_SECRET)
      .digest("hex");

    const webhookResponse = await page.request.post(`${clientesBase}/api/webhooks/wompi`, {
      data: {
        event: "transaction.updated",
        data: { transaction: { id: transactionId, status, reference } },
        signature: { properties: ["transaction.id", "transaction.status"], checksum },
        timestamp,
      },
    });
    expect(webhookResponse.status()).toBe(200);

    // 6. /mis-boletos refleja el pago confirmado.
    await page.goto(`${clientesBase}/mis-boletos`);
    await expect(page.getByText("#1")).toBeVisible();
    await expect(page.getByText(/Confirmada/)).toBeVisible();

    // 7. Cleanup: borrar el tenant desde superadmin (dispara DROP DATABASE).
    await page.goto("http://localhost:3000/tenants");
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Borrar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(slug) })).toHaveCount(0);
  });
});
