import { redirect } from "next/navigation";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
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
      <h1 className="text-2xl font-semibold">Sedes</h1>

      <CreateSedeForm />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2">Nombre</th>
            <th className="py-2">Creada</th>
          </tr>
        </thead>
        <tbody>
          {sedes.map((sede) => (
            <tr key={sede.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2">{sede.nombre}</td>
              <td className="py-2 text-gray-500">{sede.createdAt.toLocaleDateString("es")}</td>
            </tr>
          ))}
          {sedes.length === 0 && (
            <tr>
              <td colSpan={2} className="py-6 text-center text-gray-500">
                Todavía no hay sedes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
