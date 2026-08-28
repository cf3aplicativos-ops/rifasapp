import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <Card className="max-w-md">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-medium text-gray-500 dark:text-gray-400">Email</dt>
          <dd className="font-mono">{session.user.email}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Rol</dt>
          <dd className="font-mono">{session.user.rol}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Tenant ID</dt>
          <dd className="font-mono">{session.user.tenantId}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Sede ID</dt>
          <dd className="font-mono">{session.user.sedeId ?? "— (ve todas las sedes)"}</dd>
        </dl>
      </Card>
    </div>
  );
}
