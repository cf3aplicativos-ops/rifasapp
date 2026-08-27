import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de confirmación",
  PAGADA: "Confirmada",
  ANULADA: "Anulada",
  VENCIDA: "Vencida (nadie confirmó el pago a tiempo)",
};

export default async function MisBoletosPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await expirarVentasVencidas(
    prisma,
    process.env.RESERVA_TTL_HORAS ? Number(process.env.RESERVA_TTL_HORAS) : undefined,
  );

  const ventas = await prisma.venta.findMany({
    where: { clienteId: session.user.id },
    include: { boletos: true, rifa: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mis boletos</h1>
      <ul className="space-y-2">
        {ventas.map((venta) => (
          <li key={venta.id} className="rounded border border-gray-200 p-4 dark:border-gray-800">
            <p className="font-medium">{venta.rifa.nombre}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Boletos: {venta.boletos.map((b) => `#${b.numero}`).join(", ")}
            </p>
            <p className="text-sm text-gray-500">
              ${venta.montoTotal.toString()} · {ESTADO_LABEL[venta.estado] ?? venta.estado}
            </p>
          </li>
        ))}
        {ventas.length === 0 && <p className="text-gray-500">Todavía no reservaste ningún boleto.</p>}
      </ul>
    </div>
  );
}
