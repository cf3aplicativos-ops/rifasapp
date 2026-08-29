import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shuffle } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
import { requireSession } from "@/lib/require-session";
import { AsignarBoletosForm } from "./asignar-boletos-form";

export default async function AsignacionesPage({
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

  const [sedes, vendedores, asignados] = await Promise.all([
    prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { rol: "VENDEDOR" }, orderBy: { email: "asc" } }),
    prisma.boleto.findMany({
      where: {
        rifaId,
        OR: [{ asignadoASedeId: { not: null } }, { asignadoAVendedorId: { not: null } }],
      },
      include: { asignadoASede: true, asignadoAVendedor: true },
      orderBy: { numero: "asc" },
    }),
  ]);

  const formato = rifa.formatoDigitos as BoletoFormatoDigitos | null;
  const MODO_LABEL: Record<string, string> = {
    CONSECUTIVO: "Consecutivo",
    ALEATORIO: "Aleatorio",
    ABONADOS: "Abonados",
    TRASPASO: "Traspaso",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Asignación de boletos — ${rifa.nombre}`}
        description="Asignale un lote de boletos a una sede o a un vendedor. Los boletos sin asignar quedan libres, vendibles por cualquiera."
        icon={<Shuffle className="h-5 w-5" />}
      />

      <Link href={`/rifas/${rifaId}`} className="inline-block text-sm underline">
        Volver a la rifa
      </Link>

      {rifa.estado !== "ACTIVA" ? (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Activá la rifa primero — los boletos se generan recién al activarla.
          </p>
        </Card>
      ) : sedes.length === 0 && vendedores.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Creá al menos una sede o invitá un vendedor antes de asignar boletos.
          </p>
        </Card>
      ) : (
        <AsignarBoletosForm rifaId={rifaId} sedes={sedes} vendedores={vendedores} />
      )}

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Dueño
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Modo
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {asignados.map((boleto) => (
                <tr
                  key={boleto.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-900"
                >
                  <td className="px-6 py-3 font-mono">
                    #{formatNumeroBoleto(boleto.numero, formato)}
                  </td>
                  <td className="px-6 py-3">
                    {boleto.asignadoASede
                      ? `Sede: ${boleto.asignadoASede.nombre}`
                      : (boleto.asignadoAVendedor?.nombre ?? boleto.asignadoAVendedor?.email)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {boleto.asignacionModo ? MODO_LABEL[boleto.asignacionModo] : "—"}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{boleto.estado}</td>
                </tr>
              ))}
              {asignados.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay boletos asignados en esta rifa.
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
