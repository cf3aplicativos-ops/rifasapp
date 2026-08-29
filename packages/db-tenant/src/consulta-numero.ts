import type { PrismaClient } from "./generated/client";

export type ConsultaNumeroResultado =
  | { tipo: "NO_EXISTE" }
  | { tipo: "LIBRE"; boletoId: string; estado: string }
  | { tipo: "PROPIO"; boletoId: string; estado: string }
  | { tipo: "SEDE"; boletoId: string; estado: string; sedeId: string; sedeNombre: string }
  | {
      tipo: "OTRO_VENDEDOR";
      boletoId: string;
      estado: string;
      vendedorId: string;
      vendedorNombre: string;
    };

/**
 * Fase 19B: dado un número tipeado, dice quién lo tiene — para el "buscar
 * número" de sedes y vendedores (punto 3 de la fase). `comoVendedorId`/
 * `comoSedeId` son quién está consultando (para distinguir "es mío" de "es
 * de otro"); pasar como mucho uno de los dos, según el rol de quien pide.
 */
export async function consultarEstadoNumero(
  prisma: PrismaClient,
  params: { rifaId: string; numero: number; comoVendedorId?: string; comoSedeId?: string },
): Promise<ConsultaNumeroResultado> {
  const { rifaId, numero, comoVendedorId, comoSedeId } = params;

  const boleto = await prisma.boleto.findUnique({
    where: { rifaId_numero: { rifaId, numero } },
    include: { asignadoASede: true, asignadoAVendedor: true },
  });
  if (!boleto) {
    return { tipo: "NO_EXISTE" };
  }

  if (!boleto.asignadoASedeId && !boleto.asignadoAVendedorId) {
    return { tipo: "LIBRE", boletoId: boleto.id, estado: boleto.estado };
  }

  if (
    (comoVendedorId && boleto.asignadoAVendedorId === comoVendedorId) ||
    (comoSedeId && boleto.asignadoASedeId === comoSedeId)
  ) {
    return { tipo: "PROPIO", boletoId: boleto.id, estado: boleto.estado };
  }

  if (boleto.asignadoASedeId) {
    return {
      tipo: "SEDE",
      boletoId: boleto.id,
      estado: boleto.estado,
      sedeId: boleto.asignadoASedeId,
      sedeNombre: boleto.asignadoASede?.nombre ?? "una sede",
    };
  }

  return {
    tipo: "OTRO_VENDEDOR",
    boletoId: boleto.id,
    estado: boleto.estado,
    vendedorId: boleto.asignadoAVendedorId as string,
    vendedorNombre:
      boleto.asignadoAVendedor?.nombre ?? boleto.asignadoAVendedor?.email ?? "otro vendedor",
  };
}
