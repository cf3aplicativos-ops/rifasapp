import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";
import { VentaPagoButtons } from "./venta-pago-buttons";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
  VENCIDA: "Vencida",
};

const ESTADO_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "yellow",
  PAGADA: "green",
  ANULADA: "red",
  VENCIDA: "red",
};

export default async function VentasPage({
  params,
}: {
  params: Promise<{ rifaId: string }>;
}) {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const { rifaId } = await params;
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await expirarVentasVencidas(
    prisma,
    process.env.RESERVA_TTL_HORAS
      ? Number(process.env.RESERVA_TTL_HORAS)
      : undefined,
  );

  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa) notFound();

  const ventas = await prisma.venta.findMany({
    where: { rifaId },
    include: { boletos: true, cliente: true, vendedor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/rifas/${rifaId}`} className="text-sm underline">
          ← {rifa.nombre}
        </Link>
        <PageHeader title="Ventas" />
      </div>

      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Comprador
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Boletos
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Monto
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Método
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Canal
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Estado
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((venta) => (
              <tr
                key={venta.id}
                className="border-b border-gray-100 last:border-0 dark:border-gray-900"
              >
                <td className="px-6 py-3">
                  {venta.cliente?.email ?? venta.compradorNombre}
                </td>
                <td className="px-6 py-3">
                  {venta.boletos.map((b) => `#${b.numero}`).join(", ")}
                </td>
                <td className="px-6 py-3">${venta.montoTotal.toString()}</td>
                <td className="px-6 py-3">{venta.metodoPago}</td>
                <td className="px-6 py-3">
                  {venta.vendedor ? "Vendedor" : "Autocompra"}
                </td>
                <td className="px-6 py-3">
                  <Badge tone={ESTADO_TONE[venta.estado] ?? "gray"}>
                    {ESTADO_LABEL[venta.estado] ?? venta.estado}
                  </Badge>
                </td>
                <td className="px-6 py-3">
                  {venta.estado === "PENDIENTE" && (
                    <VentaPagoButtons id={venta.id} />
                  )}
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  Todavía no hay ventas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
