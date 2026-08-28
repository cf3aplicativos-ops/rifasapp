import { DollarSign, Percent, Ticket, Trophy } from "lucide-react";
import {
  agruparBoletosPorEstado,
  bucketVentasPorDia,
  calcularDeltaSemanal,
  rankearVendedores,
} from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { AreaChart } from "@rifaxapp/ui/charts/area-chart";
import { CHART_COLORS } from "@rifaxapp/ui/charts/chart-theme";
import { DonutChart } from "@rifaxapp/ui/charts/donut-chart";
import { RankingBarChart } from "@rifaxapp/ui/charts/ranking-bar-chart";
import { Badge } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { ProgressBar } from "@rifaxapp/ui/progress-bar";
import { Reveal } from "@rifaxapp/ui/reveal";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { requireSession } from "@/lib/require-session";

const ESTADO_LABEL: Record<string, string> = {
  DISPONIBLE: "Disponibles",
  RESERVADO: "Reservados",
  VENDIDO: "Vendidos",
};
const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE: CHART_COLORS.gray,
  RESERVADO: CHART_COLORS.yellow,
  VENDIDO: CHART_COLORS.green,
};

/**
 * Dashboard ejecutivo (Fase 18) — reemplaza el `<dl>` de sesión que tenían
 * los 3 dashboards de tenant desde Fase 2. TENANT_ADMIN ve todo el tenant;
 * SEDE_ADMIN ve lo mismo pero acotado a `Venta.vendedor.sedeId` (no hay
 * relación Sede↔Boleto en el schema, así que SEDE_ADMIN no ve el donut de
 * inventario de boletos — sería un dato que no es "suyo"). El `Badge` del
 * rol en `PageHeader` reemplaza al que mostraba el `<dl>` viejo — sigue
 * siendo texto exacto del rol, visible en `<main>` (lo exige
 * `e2e/admin-tenant-rbac-flow.spec.ts`).
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const esTenantAdmin = session.user.rol === "TENANT_ADMIN";
  const esSedeAdmin = session.user.rol === "SEDE_ADMIN";

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  if (!esTenantAdmin && !esSedeAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={<Badge tone="gray">{session.user.rol}</Badge>}
        />
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Este rol todavía no tiene un dashboard dedicado.
          </p>
        </Card>
      </div>
    );
  }

  const ventas = await prisma.venta.findMany({
    where: esTenantAdmin
      ? { estado: "PAGADA" }
      : { estado: "PAGADA", vendedor: { sedeId: session.user.sedeId } },
    include: { vendedor: true, boletos: true },
  });

  const ventasMetricas = ventas.map((v) => ({
    createdAt: v.createdAt,
    monto: Number(v.montoTotal),
    vendedorLabel: v.vendedor
      ? (v.vendedor.nombre ?? v.vendedor.email)
      : "Autocompra (cliente)",
  }));

  const recaudadoTotal = ventasMetricas.reduce((acc, v) => acc + v.monto, 0);
  const boletosVendidosTotal = ventas.reduce(
    (acc, v) => acc + v.boletos.length,
    0,
  );
  const ticketPromedio = ventas.length > 0 ? recaudadoTotal / ventas.length : 0;
  const deltaSemanal = calcularDeltaSemanal(ventasMetricas);
  const serieDiaria = bucketVentasPorDia(ventasMetricas, 30);
  const ranking = rankearVendedores(ventasMetricas, 5);

  const rifasActivas = await prisma.rifa.findMany({
    where: { estado: "ACTIVA" },
    orderBy: { createdAt: "desc" },
  });

  const boletoCountsPorRifa =
    rifasActivas.length > 0
      ? await prisma.boleto.groupBy({
          by: ["rifaId", "estado"],
          where: { rifaId: { in: rifasActivas.map((r) => r.id) } },
          _count: { _all: true },
        })
      : [];
  const vendidosPorRifa = new Map<string, number>();
  for (const c of boletoCountsPorRifa) {
    if (c.estado === "VENDIDO") vendidosPorRifa.set(c.rifaId, c._count._all);
  }

  let donutData: { label: string; value: number; color: string }[] | null =
    null;
  if (esTenantAdmin) {
    const boletoCountsGlobal = await prisma.boleto.groupBy({
      by: ["estado"],
      _count: { _all: true },
    });
    donutData = agruparBoletosPorEstado(
      boletoCountsGlobal.map((c) => ({
        estado: c.estado,
        count: c._count._all,
      })),
    ).map((a) => ({
      label: ESTADO_LABEL[a.estado]!,
      value: a.count,
      color: ESTADO_COLOR[a.estado]!,
    }));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={
          esTenantAdmin ? "Resumen ejecutivo del tenant" : "Resumen de tu sede"
        }
        actions={<Badge tone="gray">{session.user.rol}</Badge>}
      />

      <Reveal>
        <StatGrid>
          <Stat
            label={esTenantAdmin ? "Recaudado (tenant)" : "Recaudado (mi sede)"}
            value={recaudadoTotal}
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ deltaPct: deltaSemanal }}
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
            label="Rifas activas"
            value={rifasActivas.length}
            icon={<Trophy className="h-5 w-5" />}
            animate
          />
          <Stat
            label="Ticket promedio"
            value={ticketPromedio}
            icon={<Percent className="h-5 w-5" />}
            animate
            numberFormat="money"
          />
        </StatGrid>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={80}>
          <AreaChart
            title="Recaudación diaria"
            subtitle="Últimos 30 días"
            data={serieDiaria}
            valueFormat="money"
          />
        </Reveal>

        {esTenantAdmin && donutData && (
          <Reveal delay={160}>
            <DonutChart
              title="Boletos por estado"
              subtitle="Todas las rifas del tenant"
              data={donutData}
            />
          </Reveal>
        )}

        <Reveal
          delay={esTenantAdmin ? 240 : 160}
          className={esTenantAdmin ? "lg:col-span-2" : ""}
        >
          <RankingBarChart
            title={esTenantAdmin ? "Top vendedores" : "Ranking de mi sede"}
            subtitle="Por monto recaudado"
            data={ranking}
            valueFormat="money"
          />
        </Reveal>
      </div>

      {rifasActivas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Rifas activas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rifasActivas.map((rifa, i) => {
              const vendidos = vendidosPorRifa.get(rifa.id) ?? 0;
              const pct =
                rifa.cantidadBoletos > 0
                  ? (vendidos / rifa.cantidadBoletos) * 100
                  : 0;
              return (
                <Reveal key={rifa.id} delay={i * 70}>
                  <Card interactive className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-50">
                        {rifa.nombre}
                      </h3>
                      <Badge tone="green">Activa</Badge>
                    </div>
                    <ProgressBar
                      pct={pct}
                      label={`${vendidos} / ${rifa.cantidadBoletos} vendidos`}
                    />
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
