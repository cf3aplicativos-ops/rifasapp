import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";
import { ConsultaForm } from "./consulta-form";

export default async function ConsultasPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN" && session.user.rol !== "SEDE_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifas = await prisma.rifa.findMany({
    where: { estado: "ACTIVA" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultar número"
        description="Tipeá un número para ver si está libre, es tuyo, o lo tiene otro — y pedirlo prestado si hace falta."
        icon={<Search className="h-5 w-5" />}
      />
      <ConsultaForm rifas={rifas} puedeSolicitar={session.user.rol === "SEDE_ADMIN"} />
    </div>
  );
}
