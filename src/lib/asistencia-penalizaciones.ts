import { prisma } from "@/lib/prisma";

// ─── Configuración de asistencia (singleton) ─────────────────────────────────
export interface ConfigAsist {
  horaEntrada: string;
  toleranciaMin: number;
  retardoMaxMin: number;
  retardosPorFalta: number;
  descuentaRetardo: boolean;
  descuentaFalta: boolean;
  requiereDocFalta: boolean;
  faltasCausalBaja: number;
}

export const CONFIG_DEFAULT: ConfigAsist = {
  horaEntrada: "09:00",
  toleranciaMin: 10,
  retardoMaxMin: 30,
  retardosPorFalta: 3,
  descuentaRetardo: true,
  descuentaFalta: true,
  requiereDocFalta: true,
  faltasCausalBaja: 3,
};

export async function getConfigAsistencia(): Promise<ConfigAsist> {
  const c = await prisma.configAsistencia.findUnique({ where: { id: "singleton" } });
  if (!c) return { ...CONFIG_DEFAULT };
  return {
    horaEntrada: c.horaEntrada,
    toleranciaMin: c.toleranciaMin,
    retardoMaxMin: c.retardoMaxMin,
    retardosPorFalta: c.retardosPorFalta,
    descuentaRetardo: c.descuentaRetardo,
    descuentaFalta: c.descuentaFalta,
    requiereDocFalta: c.requiereDocFalta,
    faltasCausalBaja: c.faltasCausalBaja,
  };
}

// ─── Salario diario (día no laborado, base legal LFT art. 84/89) ──────────────
// El descuento por inasistencia es el salario del día NO trabajado, no una multa
// (las multas al salario están prohibidas por el art. 107 LFT).
export function salarioDiario(salario: number | null | undefined, periodoPago: string): number {
  if (!salario) return 0;
  // salario mensual equivalente → /30 días (criterio de salario diario integrado simplificado)
  const mensual =
    periodoPago === "SEMANAL" ? salario * 52 / 12 :
    periodoPago === "QUINCENAL" ? salario * 2 :
    periodoPago === "POR_EVENTO" ? 0 :
    salario; // MENSUAL
  return mensual / 30;
}

// ─── Resumen mensual por persona ─────────────────────────────────────────────
export interface ResumenPersona {
  personalId: string;
  nombre: string;
  salarioDia: number;
  retardos: number;
  faltasInjustificadas: number;
  faltasJustificadas: number;
  faltasPorRetardo: number;   // floor(retardos / retardosPorFalta)
  diasDescontables: number;   // faltasInjustificadas + faltasPorRetardo
  montoDescuento: number;
  causalBaja: boolean;        // faltas injustificadas ≥ umbral (informativo, art. 47 LFT)
}

interface AsistLite {
  personalId: string;
  estado: string;
  justificada: boolean;
  documentoUrl: string | null;
}

export function resumirPersona(
  personalId: string,
  nombre: string,
  salarioDia: number,
  asistencias: AsistLite[],
  cfg: ConfigAsist,
): ResumenPersona {
  const retardos = asistencias.filter(a => a.estado === "RETARDO").length;
  const faltas = asistencias.filter(a => a.estado === "FALTA");

  // Una falta cuenta como justificada solo si está marcada y (si la config lo exige) tiene documento.
  const faltasJustificadas = faltas.filter(a =>
    a.justificada && (!cfg.requiereDocFalta || !!a.documentoUrl)
  ).length;
  const faltasInjustificadas = faltas.length - faltasJustificadas;

  const faltasPorRetardo = cfg.descuentaRetardo && cfg.retardosPorFalta > 0
    ? Math.floor(retardos / cfg.retardosPorFalta)
    : 0;

  const diasDescontables =
    (cfg.descuentaFalta ? faltasInjustificadas : 0) + faltasPorRetardo;
  const montoDescuento = Math.round(diasDescontables * salarioDia * 100) / 100;

  return {
    personalId,
    nombre,
    salarioDia: Math.round(salarioDia * 100) / 100,
    retardos,
    faltasInjustificadas,
    faltasJustificadas,
    faltasPorRetardo,
    diasDescontables,
    montoDescuento,
    causalBaja: faltasInjustificadas >= cfg.faltasCausalBaja,
  };
}

// Asegura un TipoIncidencia de sistema para los descuentos automáticos de asistencia.
export async function ensureTipoAuto(): Promise<string> {
  const nombre = "Descuento por inasistencia (automático)";
  const existente = await prisma.tipoIncidencia.findFirst({ where: { nombre } });
  if (existente) return existente.id;
  const creado = await prisma.tipoIncidencia.create({
    data: {
      nombre,
      categoria: "ASISTENCIA",
      calculoTipo: "FIJO",
      valor: 0,
      esDescuento: true,
      descripcion: "Generado automáticamente por el recálculo mensual de asistencia. Corresponde a días no laborados (faltas injustificadas y retardos acumulados).",
    },
  });
  return creado.id;
}

// ─── Recálculo mensual: genera/actualiza penalizaciones PROPUESTA idempotente ──
export interface RecalculoResultado {
  mes: string;
  resumenes: ResumenPersona[];
  propuestasGeneradas: number;
  propuestasEliminadas: number;
}

export async function recalcularMes(mes: string): Promise<RecalculoResultado> {
  const [y, m] = mes.split("-").map(Number);
  const cfg = await getConfigAsistencia();
  const desde = new Date(y, m - 1, 1);
  const hasta = new Date(y, m, 1);

  const [personal, asistencias] = await Promise.all([
    prisma.personalInterno.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, salario: true, periodoPago: true },
    }),
    prisma.asistencia.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      select: { personalId: true, estado: true, justificada: true, documentoUrl: true },
    }),
  ]);

  const porPersona = new Map<string, AsistLite[]>();
  for (const a of asistencias) {
    const arr = porPersona.get(a.personalId) ?? [];
    arr.push(a);
    porPersona.set(a.personalId, arr);
  }

  const resumenes = personal.map(p =>
    resumirPersona(
      p.id, p.nombre,
      salarioDiario(p.salario, p.periodoPago),
      porPersona.get(p.id) ?? [], cfg,
    )
  );

  // Elimina las propuestas AUTO previas (aún no decididas) de este mes; conserva las ya aprobadas/rechazadas.
  const del = await prisma.incidencia.deleteMany({
    where: { origen: "AUTO", periodoNomina: mes, estado: "PROPUESTA" },
  });

  // Personas que ya tienen una incidencia AUTO decidida este mes: no se regenera.
  const yaDecididas = new Set(
    (await prisma.incidencia.findMany({
      where: { origen: "AUTO", periodoNomina: mes, estado: { in: ["APROBADA", "RECHAZADA"] } },
      select: { personalId: true },
    })).map(i => i.personalId)
  );

  const aGenerar = resumenes.filter(r => r.montoDescuento > 0 && !yaDecididas.has(r.personalId));
  let generadas = 0;
  if (aGenerar.length > 0) {
    const tipoId = await ensureTipoAuto();
    const fecha = new Date(y, m, 0, 12); // último día del mes al mediodía
    await prisma.$transaction(
      aGenerar.map(r =>
        prisma.incidencia.create({
          data: {
            personalId: r.personalId,
            tipoId,
            fecha,
            descripcion: descripcionAuto(r),
            montoCalculado: r.montoDescuento,
            periodoNomina: mes,
            origen: "AUTO",
            estado: "PROPUESTA",
          },
        })
      )
    );
    generadas = aGenerar.length;
  }

  return { mes, resumenes, propuestasGeneradas: generadas, propuestasEliminadas: del.count };
}

function descripcionAuto(r: ResumenPersona): string {
  const partes: string[] = [];
  if (r.faltasInjustificadas > 0) partes.push(`${r.faltasInjustificadas} falta(s) injustificada(s)`);
  if (r.faltasPorRetardo > 0) partes.push(`${r.faltasPorRetardo} falta(s) por acumulación de ${r.retardos} retardo(s)`);
  return `Descuento por ${r.diasDescontables} día(s) no laborado(s): ${partes.join(" + ")}.`;
}
