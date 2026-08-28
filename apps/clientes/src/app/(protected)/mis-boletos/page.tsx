import { Receipt } from "lucide-react";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de confirmación",
  PAGADA: "Confirmada",
  ANULADA: "Anulada",
  VENCIDA: "Vencida (nadie confirmó el pago a tiempo)",
};

const ESTADO_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "yellow",
  PAGADA: "green",
  ANULADA: "red",
  VENCIDA: "red",
};

export default async function MisBoletosPage({
  searchParams,
}: {
  searchParams: Promise<{ wompi?: string }>;
}) {
  const { wompi } = await searchParams;
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  await expirarVentasVencidas(
    prisma,
    process.env.RESERVA_TTL_HORAS
      ? Number(process.env.RESERVA_TTL_HORAS)
      : undefined,
  );

  const ventas = await prisma.venta.findMany({
    where: { clienteId: session.user.id },
    include: { boletos: true, rifa: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mis boletos" icon={<Receipt className="h-5 w-5" />} />
      {wompi === "1" && (
        <p className="rounded-[var(--radius-card)] border border-gray-300 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          Estamos confirmando tu pago con Wompi, puede tardar unos segundos —
          actualizá esta página si todavía la ves como &quot;Pendiente&quot;.
        </p>
      )}
      <div className="space-y-3">
        {ventas.map((venta, i) => (
          <Reveal key={venta.id} delay={i * 60}>
            <Card interactive>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{venta.rifa.nombre}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Boletos:{" "}
                    {venta.boletos.map((b) => `#${b.numero}`).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    ${venta.montoTotal.toString()}
                  </p>
                </div>
                <Badge tone={ESTADO_TONE[venta.estado] ?? "gray"}>
                  {ESTADO_LABEL[venta.estado] ?? venta.estado}
                </Badge>
              </div>
            </Card>
          </Reveal>
        ))}
        {ventas.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            Todavía no reservaste ningún boleto.
          </p>
        )}
      </div>
    </div>
  );
}
