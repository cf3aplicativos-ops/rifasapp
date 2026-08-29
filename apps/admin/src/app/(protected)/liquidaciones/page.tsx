import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";
import { CreateLiquidacionForm } from "./create-liquidacion-form";

export default async function LiquidacionesPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const [vendedoresRaw, liquidaciones] = await Promise.all([
    prisma.usuario.findMany({ where: { rol: "VENDEDOR" }, orderBy: { email: "asc" } }),
    prisma.liquidacion.findMany({
      include: { vendedor: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const vendedores = vendedoresRaw.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    email: v.email,
    comisionPct: v.comisionPct != null ? Number(v.comisionPct) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidar comisiones"
        description="Registro contable — marca las ventas pagadas de un vendedor en un período como liquidadas. El pago en sí se hace por fuera del sistema."
        icon={<Wallet className="h-5 w-5" />}
      />

      {vendedores.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todavía no hay vendedores invitados.
          </p>
        </Card>
      ) : (
        <CreateLiquidacionForm vendedores={vendedores} />
      )}

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Vendedor
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Período
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Ventas
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Monto vendido
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Comisión (%)
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Comisión ($)
                </th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map((liq) => (
                <tr
                  key={liq.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-900"
                >
                  <td className="px-6 py-3">{liq.vendedor.nombre ?? liq.vendedor.email}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {liq.periodoDesde.toLocaleDateString("es")} –{" "}
                    {liq.periodoHasta.toLocaleDateString("es")}
                  </td>
                  <td className="px-6 py-3">{liq.cantidadVentas}</td>
                  <td className="px-6 py-3">${Number(liq.montoVentas).toFixed(2)}</td>
                  <td className="px-6 py-3">{Number(liq.comisionPct)}%</td>
                  <td className="px-6 py-3 font-medium">
                    ${Number(liq.montoComision).toFixed(2)}
                  </td>
                </tr>
              ))}
              {liquidaciones.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no se generó ninguna liquidación.
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
