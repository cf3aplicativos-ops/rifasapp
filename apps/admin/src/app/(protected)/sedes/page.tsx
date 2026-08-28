import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";
import { CreateSedeForm } from "./create-sede-form";

export default async function SedesPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const sedes = await prisma.sede.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Sedes" icon={<Building2 className="h-5 w-5" />} />

      <CreateSedeForm />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Creada
                </th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((sede) => (
                <tr
                  key={sede.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-900"
                >
                  <td className="px-6 py-3">{sede.nombre}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {sede.createdAt.toLocaleDateString("es")}
                  </td>
                </tr>
              ))}
              {sedes.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay sedes.
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
