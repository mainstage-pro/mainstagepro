import { prisma } from "./prisma";
import { defaultEtapaInterna } from "./etapasInternas";

// Crea un Trato mínimo para ligarlo a una cotización cuando ésta nace sin trato
// (ej. desde el asistente de lenguaje natural o el editor sin venir de un trato).
// Regla de negocio: toda cotización debe quedar ligada a un trato del pipeline.
export async function crearTratoParaCotizacion(params: {
  clienteId: string;
  vendedorId: string;
  tipoEvento?: string | null;
  tipoServicio?: string | null;
  nombreEvento?: string | null;
  fechaEvento?: Date | string | null;
  lugar?: string | null;
  asistentesEstimados?: number | null;
  presupuestoEstimado?: number | null;
}): Promise<string> {
  // Ya existe una cotización → es una oportunidad activa. Entra directo a OPORTUNIDAD.
  const etapa = "OPORTUNIDAD";
  const trato = await prisma.trato.create({
    data: {
      clienteId: params.clienteId,
      vendedorId: params.vendedorId,
      responsableId: params.vendedorId,
      tipoEvento: params.tipoEvento || "OTRO",
      tipoServicio: params.tipoServicio || null,
      etapa,
      etapaInterna: defaultEtapaInterna(etapa),
      nombreEvento: params.nombreEvento || null,
      fechaEventoEstimada: params.fechaEvento ? new Date(params.fechaEvento) : null,
      lugarEstimado: params.lugar || null,
      asistentesEstimados: params.asistentesEstimados ?? null,
      presupuestoEstimado: params.presupuestoEstimado ?? null,
    },
    select: { id: true },
  });
  return trato.id;
}
