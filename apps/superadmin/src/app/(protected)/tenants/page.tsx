import { Building2 } from "lucide-react";
import {
  bucketTenantsPorMes,
  contarTenantsPorEstado,
  getControlPrismaClient,
} from "@rifaxapp/db-control";
import { RankingBarChart } from "@rifaxapp/ui/charts/ranking-bar-chart";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { CreateTenantForm } from "./create-tenant-form";
import { TenantRow } from "./tenant-row";

export default async function TenantsPage() {
  const prisma = getControlPrismaClient();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Bloque ejecutivo (Fase 18) — sobre el mismo `findMany` de arriba, sin
  // queries nuevas. A propósito NO cruza las DBs físicas de cada tenant
  // (recaudación global, etc.) — ver docs/ESTADO.md, es una decisión de
  // infraestructura más grande que un pulido visual.
  const porEstado = contarTenantsPorEstado(tenants);
  const porMes = bucketTenantsPorMes(tenants, 6);

  return (
    <div className="space-y-8">
      <PageHeader title="Tenants" icon={<Building2 className="h-5 w-5" />} />

      <Reveal>
        <StatGrid>
          <Stat label="Total tenants" value={tenants.length} animate />
          <Stat label="Activos" value={porEstado.ACTIVO ?? 0} animate />
          <Stat label="Suspendidos" value={porEstado.SUSPENDIDO ?? 0} animate />
          <Stat
            label="Provisionando / Error"
            value={(porEstado.PROVISIONANDO ?? 0) + (porEstado.ERROR ?? 0)}
            animate
          />
        </StatGrid>
      </Reveal>

      <Reveal delay={80}>
        <RankingBarChart
          title="Tenants creados por mes"
          subtitle="Últimos 6 meses"
          data={porMes}
          direction="vertical"
        />
      </Reveal>

      <CreateTenantForm />

      <Reveal delay={160}>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Creado
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} />
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay tenants.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </Reveal>
    </div>
  );
}
