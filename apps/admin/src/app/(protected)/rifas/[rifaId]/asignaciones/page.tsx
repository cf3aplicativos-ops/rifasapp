import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shuffle } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
import { requireSession } from "@/lib/require-session";
import { AsignarBoletosForm } from "./asignar-boletos-form";
import { AsignacionesBoard } from "./asignaciones-board";

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
  const asignadosParaBoard = asignados.map((b) => ({
    id: b.id,
    numero: b.numero,
    estado: b.estado,
    sedeId: b.asignadoASedeId,
    sedeNombre: b.asignadoASede?.nombre ?? null,
    vendedorId: b.asignadoAVendedorId,
    vendedorNombre: b.asignadoAVendedor?.nombre ?? b.asignadoAVendedor?.email ?? null,
  }));

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
        <AsignacionesBoard asignados={asignadosParaBoard} formato={formato} />
      </Reveal>
    </div>
  );
}
