import { ArrowLeftRight } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
import { requireSession } from "@/lib/require-session";
import { TraspasoRow } from "./traspaso-row";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
};

const ESTADO_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "yellow",
  ACEPTADO: "green",
  RECHAZADO: "red",
};

export default async function TraspasosPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const [entrantes, salientes] = await Promise.all([
    prisma.solicitudTraspaso.findMany({
      where: { poseedorId: session.user.id, estado: "PENDIENTE" },
      include: { solicitante: true, rifa: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.solicitudTraspaso.findMany({
      where: { solicitanteId: session.user.id },
      include: { rifa: true, poseedor: true, poseedorSede: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traspasos"
        description="Números que otros te piden prestados, y el estado de los que pediste vos."
        icon={<ArrowLeftRight className="h-5 w-5" />}
      />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400" colSpan={4}>
                  Te piden
                </th>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Rifa
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Lo pide
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {entrantes.map((solicitud) => (
                <TraspasoRow
                  key={solicitud.id}
                  solicitud={{
                    id: solicitud.id,
                    numeroFormateado: formatNumeroBoleto(
                      solicitud.numero,
                      solicitud.rifa.formatoDigitos as BoletoFormatoDigitos | null,
                    ),
                    rifaNombre: solicitud.rifa.nombre,
                    solicitanteNombre: solicitud.solicitante.nombre ?? solicitud.solicitante.email,
                  }}
                />
              ))}
              {entrantes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nadie te pidió ningún número por ahora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </Reveal>

      <Reveal delay={80}>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400" colSpan={4}>
                  Pediste vos
                </th>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Rifa
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Motivo del rechazo
                </th>
              </tr>
            </thead>
            <tbody>
              {salientes.map((solicitud) => (
                <tr
                  key={solicitud.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-900"
                >
                  <td className="px-6 py-3 font-mono">
                    #
                    {formatNumeroBoleto(
                      solicitud.numero,
                      solicitud.rifa.formatoDigitos as BoletoFormatoDigitos | null,
                    )}
                  </td>
                  <td className="px-6 py-3">{solicitud.rifa.nombre}</td>
                  <td className="px-6 py-3">
                    <Badge tone={ESTADO_TONE[solicitud.estado] ?? "gray"}>
                      {ESTADO_LABEL[solicitud.estado] ?? solicitud.estado}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {solicitud.motivoRechazo ?? "—"}
                  </td>
                </tr>
              ))}
              {salientes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no pediste ningún número prestado.
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
