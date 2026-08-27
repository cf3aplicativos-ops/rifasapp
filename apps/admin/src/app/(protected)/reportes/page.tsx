import { redirect } from "next/navigation";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";

const RIFA_ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};

type VendedorBucket = {
  label: string;
  cantidadVentas: number;
  boletosVendidos: number;
  monto: number;
};

export default async function ReportesPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const rifas = await prisma.rifa.findMany({ orderBy: { createdAt: "desc" } });

  const boletoCounts = await prisma.boleto.groupBy({
    by: ["rifaId", "estado"],
    _count: { _all: true },
  });

  const ventasPagadas = await prisma.venta.findMany({
    where: { estado: "PAGADA" },
    include: { vendedor: { include: { sede: true } }, boletos: true },
  });

  // rifaId -> { DISPONIBLE, RESERVADO, VENDIDO }
  const conteosPorRifa = new Map<string, Record<string, number>>();
  for (const c of boletoCounts) {
    const actual = conteosPorRifa.get(c.rifaId) ?? {};
    actual[c.estado] = c._count._all;
    conteosPorRifa.set(c.rifaId, actual);
  }

  // rifaId -> { recaudado, porVendedor: Map<key, VendedorBucket> }
  const resumenPorRifa = new Map<string, { recaudado: number; porVendedor: Map<string, VendedorBucket> }>();
  for (const venta of ventasPagadas) {
    const resumen = resumenPorRifa.get(venta.rifaId) ?? { recaudado: 0, porVendedor: new Map() };
    const monto = Number(venta.montoTotal);
    resumen.recaudado += monto;

    const key = venta.vendedor?.id ?? "autocompra";
    const label = venta.vendedor
      ? `${venta.vendedor.nombre ?? venta.vendedor.email}${venta.vendedor.sede ? ` (${venta.vendedor.sede.nombre})` : ""}`
      : "Autocompra (cliente)";
    const bucket = resumen.porVendedor.get(key) ?? {
      label,
      cantidadVentas: 0,
      boletosVendidos: 0,
      monto: 0,
    };
    bucket.cantidadVentas += 1;
    bucket.boletosVendidos += venta.boletos.length;
    bucket.monto += monto;
    resumen.porVendedor.set(key, bucket);

    resumenPorRifa.set(venta.rifaId, resumen);
  }

  const recaudadoTotal = ventasPagadas.reduce((acc, v) => acc + Number(v.montoTotal), 0);
  const boletosVendidosTotal = ventasPagadas.reduce((acc, v) => acc + v.boletos.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <dl className="mt-2 flex gap-8 text-sm">
          <div>
            <dt className="text-gray-500">Recaudado (todas las rifas)</dt>
            <dd className="text-lg font-semibold">${recaudadoTotal.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Boletos vendidos (todas las rifas)</dt>
            <dd className="text-lg font-semibold">{boletosVendidosTotal}</dd>
          </div>
        </dl>
      </div>

      {rifas.length === 0 && <p className="text-gray-500">Todavía no hay rifas.</p>}

      {rifas.map((rifa) => {
        const conteos = conteosPorRifa.get(rifa.id) ?? {};
        const resumen = resumenPorRifa.get(rifa.id);
        const disponibles = conteos.DISPONIBLE ?? 0;
        const reservados = conteos.RESERVADO ?? 0;
        const vendidos = conteos.VENDIDO ?? 0;

        return (
          <section key={rifa.id} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{rifa.nombre}</h2>
              <span className="text-sm text-gray-500">{RIFA_ESTADO_LABEL[rifa.estado] ?? rifa.estado}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-gray-500">Recaudado</dt>
                <dd className="font-medium">${(resumen?.recaudado ?? 0).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Disponibles</dt>
                <dd>{disponibles}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reservados</dt>
                <dd>{reservados}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Vendidos</dt>
                <dd>{vendidos}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total boletos</dt>
                <dd>{rifa.cantidadBoletos}</dd>
              </div>
            </dl>

            {resumen && resumen.porVendedor.size > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="py-1">Vendedor</th>
                    <th className="py-1">Ventas</th>
                    <th className="py-1">Boletos</th>
                    <th className="py-1">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(resumen.porVendedor.values()).map((bucket) => (
                    <tr key={bucket.label} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-1">{bucket.label}</td>
                      <td className="py-1">{bucket.cantidadVentas}</td>
                      <td className="py-1">{bucket.boletosVendidos}</td>
                      <td className="py-1">${bucket.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
