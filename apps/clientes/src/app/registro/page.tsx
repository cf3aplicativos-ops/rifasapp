import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { RegistroForm } from "./registro-form";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const headersList = await headers();
  const tenant = await resolveTenantFromHost(headersList.get("host") ?? "");
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <RegistroForm />
    </div>
  );
}
