"use client";

import { useActionState } from "react";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { PasswordInput } from "@rifaxapp/ui/password-input";
import { registerAction } from "./actions";

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

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
        <PasswordInput id="password" name="password" minLength={8} required />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
