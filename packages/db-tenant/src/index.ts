export { createTenantPrismaClient } from "./client";
export { TENANT_SCHEMA_SQL } from "./schema-sql";
export {
  PrismaClient,
  UsuarioRol,
  RifaEstado,
  BoletoEstado,
  VentaEstado,
  MetodoPago,
} from "./generated/client";
export type { Sede, Usuario, Rifa, Boleto, Venta } from "./generated/client";
