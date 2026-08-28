import Link from "next/link";
import { Calendar, Ticket, Trophy } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { DonutChart } from "@rifaxapp/ui/charts/donut-chart";
import { CHART_COLORS } from "@rifaxapp/ui/charts/chart-theme";
import { Badge } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { requireSession } from "@/lib/require-session";

const VENTA_ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Confirmada",
  ANULADA: "Anulada",
  VENCIDA: "Vencida",
};
const VENTA_ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: CHART_COLORS.yellow,
  PAGADA: CHART_COLORS.green,
  ANULADA: CHART_COLORS.red,
  VENCIDA: CHART_COLORS.gray,
};

/**
 * Dashboard del cliente (Fase 18) — reemplaza el `<dl>` de sesión. Más
 * visual que `mis-boletos` (que sigue existiendo tal cual, sin tocarlo, es
 * el detalle completo) — acá son tarjetas por rifa con los números de
 * boleto como chips, pensado para un vistazo rápido, no para el detalle
 * transaccional. El `Badge` de "CLIENTE" es la única aparición de ese
 * texto exacto en la página (`e2e/clientes-registro-flow.spec.ts`), y el
 * email ya vive en el saludo de `PageHeader`.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const ventas = await prisma.venta.findMany({
    where: { clienteId: session.user.id },
    include: { boletos: true, rifa: true },
    orderBy: { createdAt: "desc" },
  });

  const ventasPagadas = ventas.filter((v) => v.estado === "PAGADA");
  const boletosComprados = ventasPagadas.reduce(
    (acc, v) => acc + v.boletos.length,
    0,
  );
  const rifasParticipando = new Set(ventasPagadas.map((v) => v.rifaId));

  const ahora = new Date();
  const proximoSorteo = ventasPagadas
    .map((v) => v.rifa.fechaSorteo)
    .filter((f): f is Date => f !== null && f > ahora)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const conteoPorEstado = new Map<string, number>();
  for (const v of ventas) {
    conteoPorEstado.set(v.estado, (conteoPorEstado.get(v.estado) ?? 0) + 1);
  }
  const donutData = Array.from(conteoPorEstado.entries()).map(
    ([estado, value]) => ({
      label: VENTA_ESTADO_LABEL[estado] ?? estado,
      value,
      color: VENTA_ESTADO_COLOR[estado] ?? CHART_COLORS.gray,
    }),
  );

  // Agrupa boletos comprados (ventas PAGADA) por rifa, para las tarjetas.
  const porRifa = new Map<
    string,
    {
      nombre: string;
      estado: string;
      fechaSorteo: Date | null;
      numeros: number[];
    }
  >();
  for (const v of ventasPagadas) {
    const actual = porRifa.get(v.rifaId) ?? {
      nombre: v.rifa.nombre,
      estado: v.rifa.estado,
      fechaSorteo: v.rifa.fechaSorteo,
      numeros: [],
    };
    actual.numeros.push(...v.boletos.map((b) => b.numero));
    porRifa.set(v.rifaId, actual);
  }
  const rifasConBoletos = Array.from(porRifa.values()).sort(
    (a, b) => a.numeros.length - b.numeros.length,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hola, ${session.user.email}`}
        description="Tus boletos y compras"
        actions={<Badge tone="gray">{session.user.rol}</Badge>}
      />

      {ventas.length === 0 ? (
        <Reveal>
          <Card className="space-y-3 py-10 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Todavía no compraste ningún boleto.
            </p>
            <Link
              href="/rifas"
              className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand-700"
            >
              Ver rifas disponibles
            </Link>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal>
            <StatGrid>
              <Stat
                label="Boletos comprados"
                value={boletosComprados}
                icon={<Ticket className="h-5 w-5" />}
                animate
              />
              <Stat
                label="Rifas en las que participo"
                value={rifasParticipando.size}
                icon={<Trophy className="h-5 w-5" />}
                animate
              />
              <Stat
                label="Próximo sorteo"
                value={
                  proximoSorteo ? proximoSorteo.toLocaleDateString("es") : "—"
                }
                icon={<Calendar className="h-5 w-5" />}
              />
            </StatGrid>
          </Reveal>

          <Reveal delay={80}>
            <DonutChart title="Mis compras por estado" data={donutData} />
          </Reveal>

          {rifasConBoletos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Mis boletos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rifasConBoletos.map((rifa, i) => (
                  <Reveal key={rifa.nombre + i} delay={i * 70}>
                    <Card interactive className="space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-50">
                          {rifa.nombre}
                        </h3>
                        <Badge
                          tone={rifa.estado === "ACTIVA" ? "green" : "gray"}
                        >
                          {rifa.estado}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rifa.numeros.map((n) => (
                          <span
                            key={n}
                            className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
                          >
                            #{n}
                          </span>
                        ))}
                      </div>
                      {rifa.fechaSorteo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Sorteo: {rifa.fechaSorteo.toLocaleDateString("es")}
                        </p>
                      )}
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
