import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";
import { VentaPagoButtons } from "./venta-pago-buttons";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
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
        <h1 className="text-2xl font-semibold">Ventas</h1>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2">Comprador</th>
            <th className="py-2">Boletos</th>
            <th className="py-2">Monto</th>
            <th className="py-2">Método</th>
            <th className="py-2">Canal</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta) => (
            <tr key={venta.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2">{venta.cliente?.email ?? venta.compradorNombre}</td>
              <td className="py-2">
                {venta.boletos.map((b) => `#${b.numero}`).join(", ")}
              </td>
              <td className="py-2">${venta.montoTotal.toString()}</td>
              <td className="py-2">{venta.metodoPago}</td>
              <td className="py-2">{venta.vendedor ? "Vendedor" : "Autocompra"}</td>
              <td className="py-2">{ESTADO_LABEL[venta.estado] ?? venta.estado}</td>
              <td className="py-2">
                {venta.estado === "PENDIENTE" && <VentaPagoButtons id={venta.id} />}
              </td>
            </tr>
          ))}
          {ventas.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-gray-500">
                Todavía no hay ventas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
