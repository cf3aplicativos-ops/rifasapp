import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    { name: "superadmin", use: { baseURL: "http://localhost:3000" } },
    { name: "admin", use: { baseURL: "http://localhost:3001" } },
    { name: "vendedores", use: { baseURL: "http://localhost:3002" } },
    { name: "clientes", use: { baseURL: "http://localhost:3003" } },
  ],
});
