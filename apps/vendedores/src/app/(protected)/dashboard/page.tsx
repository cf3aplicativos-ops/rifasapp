import { Clock, DollarSign, Ticket } from "lucide-react";
import { bucketVentasPorDia, rankearVendedores } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { AreaChart } from "@rifaxapp/ui/charts/area-chart";
import { RankingBarChart } from "@rifaxapp/ui/charts/ranking-bar-chart";
import { Badge } from "@rifaxapp/ui/badge";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { requireSession } from "@/lib/require-session";

/**
 * Dashboard del vendedor (Fase 18) — solo sus propias ventas (`vendedorId`
 * = su propio id), no las del resto del tenant. A propósito NO se le
 * agrega `sublabel` al `SidebarShell` acá ni en el `layout.tsx` — el
 * `Badge` de "VENDEDOR" tiene que seguir siendo la única aparición de ese
 * texto exacto en toda la página (`e2e/vendedores-login-flow.spec.ts`).
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const [ventasPagadas, ventasPendientesCount] = await Promise.all([
    prisma.venta.findMany({
      where: { vendedorId: session.user.id, estado: "PAGADA" },
      include: { boletos: true, rifa: true },
    }),
    prisma.venta.count({
      where: { vendedorId: session.user.id, estado: "PENDIENTE" },
    }),
  ]);

  const ventasMetricas = ventasPagadas.map((v) => ({
    createdAt: v.createdAt,
    monto: Number(v.montoTotal),
    vendedorLabel: v.rifa.nombre,
  }));

  const recaudadoTotal = ventasMetricas.reduce((acc, v) => acc + v.monto, 0);
  const boletosVendidosTotal = ventasPagadas.reduce(
    (acc, v) => acc + v.boletos.length,
    0,
  );
  const serieDiaria = bucketVentasPorDia(ventasMetricas, 14);
  const rankingPorRifa = rankearVendedores(ventasMetricas, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Tu resumen de ventas"
        actions={<Badge tone="gray">{session.user.rol}</Badge>}
      />

      <Reveal>
        <StatGrid>
          <Stat
            label="Mis ventas confirmadas"
            value={recaudadoTotal}
            icon={<DollarSign className="h-5 w-5" />}
            animate
            numberFormat="money"
          />
          <Stat
            label="Boletos vendidos"
            value={boletosVendidosTotal}
            icon={<Ticket className="h-5 w-5" />}
            animate
          />
          <Stat
            label="Ventas pendientes de confirmar"
            value={ventasPendientesCount}
            icon={<Clock className="h-5 w-5" />}
            animate
          />
        </StatGrid>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={80}>
          <AreaChart
            title="Mis ventas"
            subtitle="Últimos 14 días"
            data={serieDiaria}
            valueFormat="money"
          />
        </Reveal>
        <Reveal delay={160}>
          <RankingBarChart
            title="Mis ventas por rifa"
            subtitle="Por monto recaudado"
            data={rankingPorRifa}
            valueFormat="money"
          />
        </Reveal>
      </div>
    </div>
  );
}
