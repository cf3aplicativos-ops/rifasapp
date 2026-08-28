import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { requireSession } from "@/lib/require-session";
import { CerrarRifaForm } from "./cerrar-rifa-form";

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};

const ESTADO_TONE: Record<string, BadgeTone> = {
  BORRADOR: "yellow",
  ACTIVA: "green",
  CERRADA: "gray",
  CANCELADA: "red",
};

export default async function RifaDetailPage({
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
  // Libera reservas de CLIENTE que nadie confirmó/anuló a tiempo (Fase 6) —
  // sin esto, "Disponibles/Reservados" de esta página mostraría boletos
  // colgados en RESERVADO para siempre. Ver expirarVentasVencidas.
  await expirarVentasVencidas(
    prisma,
    process.env.RESERVA_TTL_HORAS ? Number(process.env.RESERVA_TTL_HORAS) : undefined,
  );

  const rifa = await prisma.rifa.findUnique({
    where: { id: rifaId },
    include: { boletoGanador: true },
  });
  if (!rifa) notFound();

  const [disponibles, reservados, vendidos] = await Promise.all([
    prisma.boleto.count({ where: { rifaId, estado: "DISPONIBLE" } }),
    prisma.boleto.count({ where: { rifaId, estado: "RESERVADO" } }),
    prisma.boleto.count({ where: { rifaId, estado: "VENDIDO" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={rifa.nombre}
        description={rifa.descripcion}
        actions={<Badge tone={ESTADO_TONE[rifa.estado] ?? "gray"}>{ESTADO_LABEL[rifa.estado] ?? rifa.estado}</Badge>}
      />

      <StatGrid>
        <Stat label="Precio boleto" value={`$${rifa.precioBoleto.toString()}`} />
        <Stat label="Disponibles" value={disponibles} />
        <Stat label="Reservados" value={reservados} />
        <Stat label="Vendidos" value={vendidos} />
        <Stat label="Total" value={rifa.cantidadBoletos} />
      </StatGrid>

      <Link href={`/rifas/${rifa.id}/ventas`} className="inline-block text-sm underline">
        Ver ventas
      </Link>

      {rifa.estado === "ACTIVA" && <CerrarRifaForm rifaId={rifa.id} />}

      {rifa.estado === "CERRADA" && rifa.boletoGanador && (
        <p className="text-sm">
          Boleto ganador: <strong>#{rifa.boletoGanador.numero}</strong> — sorteado el{" "}
          {rifa.fechaSorteo?.toLocaleDateString("es")}
        </p>
      )}
    </div>
  );
}
