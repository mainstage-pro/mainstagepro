// ─────────────────────────────────────────────────────────────────────────────
// Migración de los tratos existentes al nuevo proceso comercial.
//
// Reglas innegociables:
//  · NUNCA escribe descubrimientoCompleto. Lo lee, lo usa para clasificar, jamás
//    lo recalcula ni lo sobrescribe (es el único dato de trabajo humano real).
//  · NUNCA reescribe etapaCambiadaEn: la fecha del paso se calcula desde ahí para
//    reflejar la antigüedad real. Si el paso queda en el pasado, se programa hoy y
//    la antigüedad se guarda en la nota (lo hace el motor).
//  · Idempotente: correr dos veces deja el mismo estado.
//  · Dry-run por defecto: sin commit=true no escribe nada.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { calcularDescubrimientoNivel, generarSiguientePaso } from "./motor";
import { seedProceso } from "./seed";
import type { EtapaInterna, EtapaTrato } from "./valores";

// Mapeo directo de la etapaInterna vieja a la nueva (spec de migración).
const MAPA_INTERNA: Record<string, EtapaInterna> = {
  SIN_CONTACTAR: "PRIMER_CONTACTO",
  PRESENTACION_ENVIADA: "PRIMER_CONTACTO",
  GENERANDO_CONFIANZA: "NURTURING",
  CALIFICANDO: "NURTURING",
  LISTO_DESCUBRIMIENTO: "FORMULARIO_ENVIADO",
  MODALIDAD_DEFINIDA: "FORMULARIO_ENVIADO",
  EN_SEGUIMIENTO: "FORMULARIO_ENVIADO",
  BRIEF_ENVIADO: "FORMULARIO_ENVIADO",
  DESCUBRIMIENTO_COMPLETO: "PROPUESTA_EN_ELABORACION",
  COTIZACION_ELABORACION: "PROPUESTA_EN_ELABORACION",
  COTIZACION_ENVIADA: "COTIZACION_ENVIADA",
  NEGOCIACION: "CAMBIOS_Y_NEGOCIACION",
  ESPERANDO_DECISION: "CAMBIOS_Y_NEGOCIACION",
  CONFIRMACION_VERBAL: "CONFIRMADA",
  ANTICIPO_PAGADO: "FORMALIZADA",
  EN_PRODUCCION: "FORMALIZADA",
  MOTIVO_REGISTRADO: "PERDIDA",
  // La NURTURING vieja solo existía bajo VENTA_PERDIDA (candidato a reactivación).
  NURTURING: "PERDIDA",
};

type Caso = "A" | "B" | "C" | "D" | "CERRADO" | "DESCUBRIMIENTO";

type Plan = {
  id: string;
  cliente: string;
  evento: string | null;
  etapaVieja: string;
  internaVieja: string | null;
  nuevaEtapa: EtapaTrato;
  nuevaInterna: EtapaInterna;
  caso: Caso;
  descubrimientoCompleto: boolean;
  nivel: "BASICO" | "TECNICO" | null;
  descubrimientoPendiente: boolean;
  momentoContratacion?: "EXPLORANDO";
};

const CERRADAS = ["VENTA_CERRADA", "VENTA_PERDIDA"];

function planificar(t: {
  id: string;
  etapa: string;
  etapaInterna: string | null;
  descubrimientoCompleto: boolean;
  tipoProspecto: string | null;
  nombreEvento: string | null;
  cliente?: { nombre: string } | null;
  serviciosInteres: string | null;
  lugarEstimado: string | null;
  fechaEventoEstimada: Date | null;
  horaInicioEvento: string | null;
  duracionMontajeHrs: number | null;
  contactoVenueNombre: string | null;
}): Plan {
  const etapaVieja = t.etapa;
  const activo = !CERRADAS.includes(etapaVieja);
  const disc = t.descubrimientoCompleto === true;
  const nivel = calcularDescubrimientoNivel(t as never);

  let nuevaEtapa: EtapaTrato;
  let nuevaInterna: EtapaInterna;
  let caso: Caso;
  let descubrimientoPendiente = false;
  let momentoContratacion: "EXPLORANDO" | undefined;

  if (!activo) {
    // Cerrados: se mantiene la etapa, se mapea la subetapa (fallback por etapa).
    nuevaEtapa = etapaVieja as EtapaTrato;
    nuevaInterna =
      (t.etapaInterna ? MAPA_INTERNA[t.etapaInterna] : undefined) ??
      (etapaVieja === "VENTA_CERRADA" ? "CONFIRMADA" : "PERDIDA");
    caso = "CERRADO";
  } else if (etapaVieja === "OPORTUNIDAD") {
    nuevaEtapa = "OPORTUNIDAD";
    nuevaInterna = (t.etapaInterna && MAPA_INTERNA[t.etapaInterna]) || "PROPUESTA_EN_ELABORACION";
    // Solo subetapas de OPORTUNIDAD son válidas aquí; si mapeó a otra, corrígela.
    if (!["PROPUESTA_EN_ELABORACION", "COTIZACION_ENVIADA", "CAMBIOS_Y_NEGOCIACION"].includes(nuevaInterna)) {
      nuevaInterna = "PROPUESTA_EN_ELABORACION";
    }
    if (disc) {
      caso = "A";
    } else {
      caso = "B";
      descubrimientoPendiente = true;
    }
  } else if (etapaVieja === "LEAD" || etapaVieja === "PROSPECCION") {
    if (disc) {
      // Caso C: descubrimiento hecho pero nunca cotizado → oportunidad inmediata.
      nuevaEtapa = "OPORTUNIDAD";
      nuevaInterna = "PROPUESTA_EN_ELABORACION";
      caso = "C";
    } else {
      const esNurturing =
        t.tipoProspecto === "NURTURING" ||
        (t.etapaInterna != null && ["GENERANDO_CONFIANZA", "CALIFICANDO"].includes(t.etapaInterna));
      if (esNurturing) {
        nuevaInterna = "NURTURING";
        nuevaEtapa = "PROSPECCION";
        momentoContratacion = "EXPLORANDO";
      } else {
        nuevaInterna = "PRIMER_CONTACTO";
        nuevaEtapa = "CONTACTO_INICIAL";
      }
      caso = "D";
    }
  } else if (etapaVieja === "DESCUBRIMIENTO") {
    // La etapa DESCUBRIMIENTO casi no se usó. Se clasifica por descubrimientoCompleto.
    if (disc) {
      nuevaEtapa = "OPORTUNIDAD";
      nuevaInterna = "PROPUESTA_EN_ELABORACION";
      caso = "C";
    } else {
      nuevaEtapa = "DESCUBRIMIENTO";
      nuevaInterna = "FORMULARIO_ENVIADO";
      caso = "DESCUBRIMIENTO";
    }
  } else {
    // Etapa desconocida: no la tocamos más que para mapear la subetapa.
    nuevaEtapa = etapaVieja as EtapaTrato;
    nuevaInterna = (t.etapaInterna && MAPA_INTERNA[t.etapaInterna]) || "PRIMER_CONTACTO";
    caso = "D";
  }

  return {
    id: t.id,
    cliente: t.cliente?.nombre ?? "—",
    evento: t.nombreEvento,
    etapaVieja,
    internaVieja: t.etapaInterna,
    nuevaEtapa,
    nuevaInterna,
    caso,
    descubrimientoCompleto: disc,
    nivel,
    descubrimientoPendiente,
    momentoContratacion,
  };
}

export type ReporteMigracion = {
  dryRun: boolean;
  total: number;
  porEtapaInterna: Record<string, number>;
  porCaso: Record<string, number>;
  casoC: { id: string; cliente: string; evento: string | null }[];
  descubrimientoPendiente: number;
  nivel: { BASICO: number; TECNICO: number; SIN_NIVEL: number };
  activosSinFecha: { id: string; cliente: string; motivo: string }[];
  vencidosDiaUno: { id: string; cliente: string; diasAntiguedad: number }[];
  pasosGenerados: number;
};

export async function migrarTratos({ commit = false }: { commit?: boolean } = {}): Promise<ReporteMigracion> {
  const tratos = await prisma.trato.findMany({
    select: {
      id: true, etapa: true, etapaInterna: true, etapaCambiadaEn: true,
      descubrimientoCompleto: true, tipoProspecto: true, nombreEvento: true,
      fechaProximaAccion: true,
      serviciosInteres: true, lugarEstimado: true, fechaEventoEstimada: true,
      horaInicioEvento: true, duracionMontajeHrs: true, contactoVenueNombre: true,
      cliente: { select: { nombre: true } },
    },
  });

  const planes = tratos.map((t) => planificar(t));

  const reporte: ReporteMigracion = {
    dryRun: !commit,
    total: planes.length,
    porEtapaInterna: {},
    porCaso: {},
    casoC: [],
    descubrimientoPendiente: 0,
    nivel: { BASICO: 0, TECNICO: 0, SIN_NIVEL: 0 },
    activosSinFecha: [],
    vencidosDiaUno: [],
    pasosGenerados: 0,
  };

  for (const p of planes) {
    reporte.porEtapaInterna[p.nuevaInterna] = (reporte.porEtapaInterna[p.nuevaInterna] ?? 0) + 1;
    reporte.porCaso[p.caso] = (reporte.porCaso[p.caso] ?? 0) + 1;
    if (p.caso === "C") reporte.casoC.push({ id: p.id, cliente: p.cliente, evento: p.evento });
    if (p.descubrimientoPendiente) reporte.descubrimientoPendiente += 1;
    if (p.nivel === "BASICO") reporte.nivel.BASICO += 1;
    else if (p.nivel === "TECNICO") reporte.nivel.TECNICO += 1;
    else reporte.nivel.SIN_NIVEL += 1;
  }

  if (!commit) return reporte;

  // ── Aplicar (commit) ────────────────────────────────────────────────────────
  // Garantiza que las subetapas/pasos del estándar existan antes de generar pasos.
  await seedProceso();

  const CERRADAS_SET = new Set(CERRADAS);

  for (const p of planes) {
    const data: Record<string, unknown> = {
      etapa: p.nuevaEtapa,
      etapaInterna: p.nuevaInterna,
      descubrimientoNivel: p.nivel,
      descubrimientoPendiente: p.descubrimientoPendiente,
    };
    if (p.momentoContratacion) data.momentoContratacion = p.momentoContratacion;
    // Nunca se escribe descubrimientoCompleto ni etapaCambiadaEn.
    await prisma.trato.update({ where: { id: p.id }, data });

    const activo = !CERRADAS_SET.has(p.nuevaEtapa);
    if (!activo) continue;

    // Un solo paso de proceso pendiente: elimina los pendientes (ex-auto) y regenera.
    await prisma.seguimiento.deleteMany({ where: { tratoId: p.id, tipo: "PROCESO", completado: false } });
    const seg = await generarSiguientePaso(p.id);
    if (seg) reporte.pasosGenerados += 1;
  }

  // ── Recolectar métricas post-commit ──────────────────────────────────────────
  const activos = await prisma.trato.findMany({
    where: { etapa: { notIn: CERRADAS } },
    select: {
      id: true, etapaInterna: true, fechaProximaAccion: true, etapaCambiadaEn: true,
      cliente: { select: { nombre: true } },
    },
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (const t of activos) {
    if (!t.fechaProximaAccion) {
      const motivo = t.etapaInterna === "CAMBIOS_Y_NEGOCIACION"
        ? "Subetapa manual (el usuario elige el paso)"
        : "Sin paso disponible en la subetapa";
      reporte.activosSinFecha.push({ id: t.id, cliente: t.cliente?.nombre ?? "—", motivo });
    }
    // Vencido desde el día uno: la fecha original (desde etapaCambiadaEn) ya era pasada.
    if (t.etapaCambiadaEn && t.fechaProximaAccion) {
      const fp = new Date(t.fechaProximaAccion);
      fp.setHours(0, 0, 0, 0);
      if (fp.getTime() === hoy.getTime()) {
        const dias = Math.round((hoy.getTime() - new Date(t.etapaCambiadaEn).getTime()) / 86400000);
        if (dias > 0) reporte.vencidosDiaUno.push({ id: t.id, cliente: t.cliente?.nombre ?? "—", diasAntiguedad: dias });
      }
    }
  }

  return reporte;
}
