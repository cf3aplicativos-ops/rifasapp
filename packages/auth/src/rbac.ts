import type { Session } from "next-auth";
import type { UsuarioRol } from "@rifaxapp/db-tenant";

/**
 * Tira si el rol del usuario en sesión no está entre los permitidos. Usar al
 * principio de cada Server Action que solo ciertos roles puedan invocar
 * (ej. crear una Sede es TENANT_ADMIN-only).
 */
export function assertRole(session: Session | null, allowedRoles: UsuarioRol[]): asserts session is Session {
  if (!session?.user) {
    throw new Error("No hay sesión");
  }
  if (!allowedRoles.includes(session.user.rol)) {
    throw new Error(`El rol "${session.user.rol}" no tiene permiso para esta acción`);
  }
}
