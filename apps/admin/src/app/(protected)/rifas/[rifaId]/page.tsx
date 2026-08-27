import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";
import { CerrarRifaForm } from "./cerrar-rifa-form";

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
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
      <div>
        <h1 className="text-2xl font-semibold">{rifa.nombre}</h1>
        {rifa.descripcion && <p className="text-gray-600 dark:text-gray-400">{rifa.descripcion}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-gray-500">Estado</dt>
          <dd>{ESTADO_LABEL[rifa.estado] ?? rifa.estado}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Precio boleto</dt>
          <dd>${rifa.precioBoleto.toString()}</dd>
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
          <dt className="text-gray-500">Total</dt>
          <dd>{rifa.cantidadBoletos}</dd>
        </div>
      </dl>

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
