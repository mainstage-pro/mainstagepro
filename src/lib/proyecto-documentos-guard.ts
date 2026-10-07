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
  tipoServicio: true,
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
  escenarioMedidas: true,
  escenarioAlturaM: true,
  escenarioAccesos: true,
  escenarioProveedor: true,
  escenarioNotas: true,
  encargado: { select: { name: true } },
  trato: { select: { ideasReferencias: true } },
  equipos: { select: { confirmado: true } },
  personal: { select: { tecnicoId: true, rolTecnicoId: true, rolEnEvento: true, coordinaEnSitio: true } },
  proveedoresEvento: { select: { responsable: true, imprevisto: true } },
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
  const bloqueos = await bloqueosDocumento(proyectoId, tipo);
  if (bloqueos.length === 0) return null;

  return NextResponse.json(
    {
      error: `${DOCUMENTO_LABELS[tipo]}: falta información del proyecto`,
      bloqueos,
    },
    { status: 409 }
  );
}

/** La lista cruda de bloqueos, para quien quiera presentarla a su manera. */
export async function bloqueosDocumento(
  proyectoId: string,
  tipo: TipoDocumento
): Promise<string[]> {
  const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: SELECT });
  if (!p) return []; // el endpoint ya responde 404 por su cuenta

  const input: ProyectoDocumentoInput = {
    tipoServicio: p.tipoServicio,
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
    coordinadoresEnSitio: p.personal.filter(x => x.tecnicoId && x.coordinaEnSitio).length,
    // Los imprevistos se piden con el evento ya corriendo: no hay preproducción
    // que los asigne, así que no cuentan para el candado.
    proveedoresSinResponsable: p.proveedoresEvento.filter(
      pv => !pv.imprevisto && !pv.responsable?.trim()
    ).length,
    escenarioMedidas: p.escenarioMedidas,
    escenarioAccesos: p.escenarioAccesos,
    // El bloque solo aplica si alguien ya dijo que hay entarimado. Sin esa
    // señal no damos lata: hay eventos que sencillamente no llevan escenario.
    llevaEscenario: Boolean(
      p.escenarioMedidas?.trim() ||
        p.escenarioAlturaM ||
        p.escenarioAccesos?.trim() ||
        p.escenarioProveedor?.trim() ||
        p.escenarioNotas?.trim()
    ),
  };

  return requisitosDocumento(tipo, input).bloqueos;
}
