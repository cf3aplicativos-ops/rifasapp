import { redirect } from "next/navigation";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";
import { CreateUsuarioForm } from "./create-usuario-form";

export default async function UsuariosPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const [usuarios, sedes] = await Promise.all([
    prisma.usuario.findMany({ orderBy: { createdAt: "desc" }, include: { sede: true } }),
    prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      {sedes.length === 0 ? (
        <p className="text-sm text-gray-500">Creá al menos una sede antes de invitar usuarios.</p>
      ) : (
        <CreateUsuarioForm sedes={sedes} />
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2">Email</th>
            <th className="py-2">Rol</th>
            <th className="py-2">Sede</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2 font-mono">{usuario.email}</td>
              <td className="py-2">{usuario.rol}</td>
              <td className="py-2">{usuario.sede?.nombre ?? "—"}</td>
            </tr>
          ))}
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-500">
                Todavía no hay usuarios además del admin.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
