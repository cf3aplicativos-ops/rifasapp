import { AuthShell } from "@rifaxapp/ui/auth-shell";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Rifaxapp"
      subtitle="Panel de Superadmin"
      error={error && "Email o contraseña incorrectos."}
    >
      <form action={loginAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required className={formInputClassName} />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={formInputClassName}
          />
        </div>

        <Button type="submit" className="w-full">
          Ingresar
        </Button>
      </form>
    </AuthShell>
  );
}
