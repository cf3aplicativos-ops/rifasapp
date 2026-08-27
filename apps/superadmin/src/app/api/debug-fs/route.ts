import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

// TEMPORAL (Fase 11) — debug de "could not locate the Query Engine" en
// producción. Borrar apenas se resuelva.
export async function GET() {
  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "node_modules/@rifaxapp/db-tenant"),
    path.join(process.cwd(), "node_modules/@rifaxapp/db-tenant/src/generated/client"),
    "/var/task/apps/superadmin/src/generated/client",
    "/var/task",
    "/var/task/node_modules/@rifaxapp",
    "/var/task/packages/db-tenant/src/generated/client",
    "/ROOT/packages/db-tenant/src/generated/client",
    "/vercel/path0/packages/db-tenant/src/generated/client",
  ];

  const result: Record<string, string[] | string> = {};
  for (const dir of candidates) {
    try {
      if (existsSync(dir)) {
        result[dir] = readdirSync(dir);
      } else {
        result[dir] = "MISSING";
      }
    } catch (err) {
      result[dir] = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return Response.json({ cwd: process.cwd(), result });
}
