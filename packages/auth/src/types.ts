import type { UsuarioRol } from "@rifaxapp/db-tenant";

// Augmenta la sesión/JWT de Auth.js para que tenantId/sedeId/rol viajen
// tipados en toda la app, tal como especifica docs/ARQUITECTURA.md
// ("JWT/sesión lleva {tenantId, sedeId|null, role, userId}").
declare module "next-auth" {
  interface User {
    tenantId: string;
    sedeId: string | null;
    rol: UsuarioRol;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      tenantId: string;
      sedeId: string | null;
      rol: UsuarioRol;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId?: string;
    sedeId?: string | null;
    rol?: UsuarioRol;
  }
}
