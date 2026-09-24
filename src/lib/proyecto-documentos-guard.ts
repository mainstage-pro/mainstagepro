// src/lib/proyecto-documentos-guard.ts
// Aplica los candados de `proyecto-documentos.ts` del lado servidor. Los
// endpoints de PDF son públicos para cualquier sesión, así que el bloqueo real
// vive aquí; la UI solo refleja el mismo criterio.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENTO_LABELS,
  requisitosDocumento,
  type ProyectoDocumentoInput,
  type TipoDocumento,
} from "@/lib/proyecto-documentos";

const SELECT = {
  lugarEvento: true,
  direccionVenue: true,
  linkMaps: true,
  fechaMontaje: true,
  horaInicioMontaje: true,
  horaInicioEvento: true,
  horaInicio: true,
  llamadoBodega: true,
  lugarLlamado: true,
  encargadoLugar: true,
  encargadoCliente: true,
  contactosEmergencia: true,
  logisticaRenta: true,
  encargado: { select: { name: true } },
  trato: { select: { ideasReferencias: true } },
  equipos: { select: { confirmado: true } },
  personal: { select: { tecnicoId: true, rolTecnicoId: true, rolEnEvento: true } },
  bloquesTiempo: { select: { id: true } },
} as const;

/**
 * Devuelve una respuesta 409 si al proyecto le falta información para generar
 * el documento, o `null` si puede descargarse.
 */
export async function bloqueoDocumento(
  proyectoId: string,
  tipo: TipoDocumento
): Promise<NextResponse | null> {
  const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: SELECT });
  if (!p) return null; // el endpoint ya responde 404 por su cuenta

  const input: ProyectoDocumentoInput = {
    lugarEvento: p.lugarEvento,
    direccionVenue: p.direccionVenue,
    linkMaps: p.linkMaps,
    fechaMontaje: p.fechaMontaje,
    horaInicioMontaje: p.horaInicioMontaje,
    horaInicioEvento: p.horaInicioEvento,
    horaInicio: p.horaInicio,
    llamadoBodega: p.llamadoBodega,
    lugarLlamado: p.lugarLlamado,
    encargadoNombre: p.encargado?.name ?? null,
    encargadoLugar: p.encargadoLugar,
    encargadoCliente: p.encargadoCliente,
    contactosEmergencia: p.contactosEmergencia,
    bloquesCronologia: p.bloquesTiempo.length,
    logisticaRenta: p.logisticaRenta || p.trato?.ideasReferencias || null,
    equiposCount: p.equipos.length,
    personalCount: p.personal.filter(x => x.tecnicoId).length,
    personalSinAsignar: p.personal.filter(x => !x.tecnicoId).length,
    personalSinRol: p.personal.filter(x => x.tecnicoId && !x.rolTecnicoId && !x.rolEnEvento?.trim()).length,
    equiposSinConfirmar: p.equipos.filter(e => !e.confirmado).length,
  };

  const { bloqueos } = requisitosDocumento(tipo, input);
  if (bloqueos.length === 0) return null;

  return NextResponse.json(
    {
      error: `${DOCUMENTO_LABELS[tipo]}: falta información del proyecto`,
      bloqueos,
    },
    { status: 409 }
  );
}
