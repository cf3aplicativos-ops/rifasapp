import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { ProgressBar } from "@rifaxapp/ui/progress-bar";
import { Reveal } from "@rifaxapp/ui/reveal";
import { Stat, StatGrid } from "@rifaxapp/ui/stat";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
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
    process.env.RESERVA_TTL_HORAS
      ? Number(process.env.RESERVA_TTL_HORAS)
      : undefined,
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
        icon={<Trophy className="h-5 w-5" />}
        actions={
          <Badge tone={ESTADO_TONE[rifa.estado] ?? "gray"}>
            {ESTADO_LABEL[rifa.estado] ?? rifa.estado}
          </Badge>
        }
      />

      <Reveal>
        <StatGrid>
          <Stat
            label="Precio boleto"
            value={`$${rifa.precioBoleto.toString()}`}
          />
          <Stat label="Disponibles" value={disponibles} animate />
          <Stat label="Reservados" value={reservados} animate />
          <Stat label="Vendidos" value={vendidos} animate />
          <Stat label="Total" value={rifa.cantidadBoletos} animate />
        </StatGrid>
      </Reveal>

      <Reveal delay={80}>
        <ProgressBar
          pct={
            rifa.cantidadBoletos > 0
              ? (vendidos / rifa.cantidadBoletos) * 100
              : 0
          }
          label={`${vendidos} / ${rifa.cantidadBoletos} boletos vendidos`}
        />
      </Reveal>

      <div className="flex flex-wrap gap-4">
        <Link
          href={`/rifas/${rifa.id}/ventas`}
          className="inline-block text-sm underline"
        >
          Ver ventas
        </Link>
        <Link
          href={`/rifas/${rifa.id}/premios`}
          className="inline-block text-sm underline"
        >
          Premios anticipados
        </Link>
        <Link
          href={`/rifas/${rifa.id}/asignaciones`}
          className="inline-block text-sm underline"
        >
          Asignación de boletos
        </Link>
      </div>

      {rifa.estado === "ACTIVA" && <CerrarRifaForm rifaId={rifa.id} />}

      {rifa.estado === "CERRADA" && rifa.boletoGanador && (
        <p className="text-sm">
          Boleto ganador:{" "}
          <strong>
            #
            {formatNumeroBoleto(
              rifa.boletoGanador.numero,
              rifa.formatoDigitos as BoletoFormatoDigitos | null,
            )}
          </strong>{" "}
          — sorteado el {rifa.fechaSorteo?.toLocaleDateString("es")}
        </p>
      )}
    </div>
  );
}
