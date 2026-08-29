import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";
import { CreateUsuarioForm } from "./create-usuario-form";
import { UsuarioRow } from "./usuario-row";

export default async function UsuariosPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const [usuarios, sedes] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      include: { sede: true },
    }),
    prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" icon={<Users className="h-5 w-5" />} />

      {sedes.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Creá al menos una sede antes de invitar usuarios.
          </p>
        </Card>
      ) : (
        <CreateUsuarioForm sedes={sedes} />
      )}

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Rol
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Sede
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Comisión
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <UsuarioRow
                  key={usuario.id}
                  usuario={{
                    id: usuario.id,
                    email: usuario.email,
                    rol: usuario.rol,
                    sedeNombre: usuario.sede?.nombre ?? null,
                    comisionPct: usuario.comisionPct != null ? Number(usuario.comisionPct) : null,
                  }}
                />
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay usuarios además del admin.
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
