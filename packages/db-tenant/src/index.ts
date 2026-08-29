export { createTenantPrismaClient } from "./client";
export { TENANT_SCHEMA_SQL } from "./schema-sql";
export {
  expirarVentasVencidas,
  DEFAULT_RESERVA_TTL_HORAS,
} from "./expirar-ventas-vencidas";
export {
  reservarBoletosParaVenta,
  venderBoletosComoVendedor,
  confirmarPagoDeVenta,
  anularVentaPendiente,
  assertBoletosVendibles,
  VentaLifecycleError,
} from "./venta-lifecycle";
export {
  bucketVentasPorDia,
  calcularDeltaSemanal,
  rankearVendedores,
  agruparBoletosPorEstado,
} from "./dashboard-metrics";
export type { VentaMetrica } from "./dashboard-metrics";
export {
  CANTIDAD_MAXIMA_POR_FORMATO,
  numeroInicialBoleto,
} from "./boleto-format";
export {
  asignarBoletosConsecutivo,
  asignarBoletosAleatorio,
  asignarBoletosAbonados,
  AsignacionError,
} from "./asignacion-boletos";
export type { AsignacionTarget, AsignacionAbonadoResultado } from "./asignacion-boletos";
export { solicitarTraspaso, resolverTraspaso, TraspasoError } from "./traspaso";
export type { ResolverTraspasoDecision } from "./traspaso";
export { consultarEstadoNumero } from "./consulta-numero";
export type { ConsultaNumeroResultado } from "./consulta-numero";
export { crearLiquidacion, LiquidacionError } from "./liquidacion";
export {
  PrismaClient,
  UsuarioRol,
  RifaEstado,
  BoletoEstado,
  VentaEstado,
  MetodoPago,
  RifaFormatoDigitos,
  AsignacionModo,
  TraspasoEstado,
} from "./generated/client";
export type {
  Sede,
  Usuario,
  Rifa,
  Boleto,
  Venta,
  PremioAnticipado,
  Abonado,
  SolicitudTraspaso,
  Liquidacion,
} from "./generated/client";
