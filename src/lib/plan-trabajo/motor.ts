/**
 * Motor de Recurrencia — Plan de Trabajo (Bloque 2: genera Tarea, no PTTareaInstancia)
 * Genera las Tarea del día según la frecuencia definida en cada PTTareaTemplate.
 * El modelo Tarea es el hub central de ejecución (tipoOrigen="PLAN", ptTemplateId).
 *
 * Zonas horarias: toda la lógica trabaja en America/Mexico_City.
 */

import { prisma } from "@/lib/prisma";

// ── Helpers de fecha en zona México ──────────────────────────────────────────

function getMexicoDayOfWeek(date: Date): number {
  // 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
  return parseInt(
    date.toLocaleDateString("en-US", { timeZone: "America/Mexico_City", weekday: "short" })
      .replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/, (w) =>
        ({ Sun: "0", Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6" }[w] ?? "0")
      )
  );
}

function getMexicoDayOfMonth(date: Date): number {
  return parseInt(date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).split("-")[2]);
}

function getMexicoMonth(date: Date): number {
  return parseInt(date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).split("-")[1]);
}

function getMexicoYear(date: Date): number {
  return parseInt(date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).split("-")[0]);
}

function getWeekOfMonth(date: Date): number {
  const day = getMexicoDayOfMonth(date);
  return Math.ceil(day / 7);
}

function isLastWeekOfMonth(date: Date): boolean {
  const year = getMexicoYear(date);
  const month = getMexicoMonth(date);
  const lastDay = new Date(year, month, 0).getDate();
  const day = getMexicoDayOfMonth(date);
  return day > lastDay - 7;
}

function isWorkDay(dow: number): boolean {
  return dow >= 1 && dow <= 5; // lunes a viernes
}

// ── Calcular si un template debe generarse en una fecha dada ─────────────────

function debeGenerarse(template: {
  frecuencia: string;
  diasSemana: number[];
  diaDelMes: number | null;
  semanaDeMes: number[];
}, fecha: Date): boolean {
  const dow = getMexicoDayOfWeek(fecha);
  const dom = getMexicoDayOfMonth(fecha);
  const weekOfMonth = getWeekOfMonth(fecha);

  switch (template.frecuencia) {
    case "DIARIO":
      return isWorkDay(dow);
    case "SEMANAL":
      return template.diasSemana.includes(dow);
    case "QUINCENAL": {
      const startOfYear = new Date(getMexicoYear(fecha), 0, 1);
      const dayOfYear = Math.floor((fecha.getTime() - startOfYear.getTime()) / 86400000);
      const weekOfYear = Math.floor(dayOfYear / 7);
      return weekOfYear % 2 === 0 && template.diasSemana.includes(dow);
    }
    case "MENSUAL":
      if (template.diaDelMes !== null && template.diaDelMes !== undefined) {
        return dom === template.diaDelMes;
      }
      if (template.semanaDeMes && template.semanaDeMes.length > 0) {
        return template.semanaDeMes.some((s) => {
          if (s === 5) return isLastWeekOfMonth(fecha) && template.diasSemana.includes(dow);
          return weekOfMonth === s && template.diasSemana.includes(dow);
        });
      }
      return template.diasSemana.includes(dow);
    case "TRIMESTRAL": {
      const month = getMexicoMonth(fecha);
      const isFirstMonthOfQuarter = [1, 4, 7, 10].includes(month);
      return isFirstMonthOfQuarter && weekOfMonth === 1 && template.diasSemana.includes(dow);
    }
    case "POR_EVENTO":
      return false;
    default:
      return false;
  }
}

// ── Calcular la fecha/hora de vencimiento ────────────────────────────────────

function calcularVencimiento(template: { horaLimite: string | null }, fecha: Date): Date {
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const hora = template.horaLimite ?? "23:59";
  return new Date(`${dateStr}T${hora}:00.000-06:00`);
}

// ── Ventana del período (idempotencia: 1 Tarea por template+usuario/período) ──

function periodoWindow(frecuencia: string, fecha: Date): { inicio: Date; fin: Date } {
  const tz = "America/Mexico_City";
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: tz });
  const dayInicio = new Date(`${dateStr}T00:00:00.000-06:00`);
  const dayFin = new Date(`${dateStr}T23:59:59.999-06:00`);

  switch (frecuencia) {
    case "SEMANAL":
    case "QUINCENAL": {
      const dow = getMexicoDayOfWeek(fecha); // 0=dom
      const offsetLunes = (dow + 6) % 7;
      const lunes = new Date(dayInicio); lunes.setDate(dayInicio.getDate() - offsetLunes);
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
      return { inicio: lunes, fin: domingo };
    }
    case "MENSUAL": {
      const y = getMexicoYear(fecha), m = getMexicoMonth(fecha);
      return {
        inicio: new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00.000-06:00`),
        fin: new Date(new Date(y, m, 0, 23, 59, 59, 999)),
      };
    }
    case "TRIMESTRAL": {
      const y = getMexicoYear(fecha), m = getMexicoMonth(fecha);
      const qStart = Math.floor((m - 1) / 3) * 3 + 1;
      return {
        inicio: new Date(`${y}-${String(qStart).padStart(2, "0")}-01T00:00:00.000-06:00`),
        fin: new Date(new Date(y, qStart + 2, 0, 23, 59, 59, 999)),
      };
    }
    default:
      return { inicio: dayInicio, fin: dayFin };
  }
}

// ── Normalización de área (nombre PTArea → código de Tarea.area) ─────────────

function normalizeArea(nombre: string | null | undefined): string {
  if (!nombre) return "GENERAL";
  const n = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (n.includes("VENTA")) return "VENTAS";
  if (n.includes("MARKETING")) return "MARKETING";
  if (n.includes("PRODUCC")) return "PRODUCCION";
  if (n.includes("ADMINISTRA")) return "ADMINISTRACION";
  if (n.includes("DIRECC")) return "DIRECCION";
  if (n.includes("RRHH") || n.includes("RECURSOS")) return "RRHH";
  return "GENERAL";
}

function impactoAPrioridad(impacto: string | null | undefined): string {
  switch (impacto) {
    case "critico": return "URGENTE";
    case "alto": return "ALTA";
    default: return "MEDIA";
  }
}

// Regla de evidencia al generar (orden estricto)
function reglaEvidencia(template: { esAccionCampo: boolean; tipo: string; moduloDestino: string | null }): {
  requiereEvidencia: boolean; tipoEvidencia: string;
} {
  if (template.esAccionCampo) return { requiereEvidencia: true, tipoEvidencia: "FOTO" };
  if (template.tipo === "ENTREGABLE") return { requiereEvidencia: true, tipoEvidencia: "ARCHIVO" };
  if (template.moduloDestino) return { requiereEvidencia: true, tipoEvidencia: "ENLACE_MODULO" };
  return { requiereEvidencia: true, tipoEvidencia: "NOTA" };
}

type TemplateConArea = {
  id: string; nombre: string; descripcion: string | null; tipo: string;
  frecuencia: string; diasSemana: number[]; diaDelMes: number | null; semanaDeMes: number[];
  horaLimite: string | null; responsableId: string | null; tipoAsignacion: string;
  puestoDefault: string | null; areaAsignada: string | null; impacto: string;
  esAccionCampo: boolean; moduloDestino: string | null; moduloTexto: string | null;
  moduloDisponible: boolean; cuando: string | null; porqueSeHace: string | null;
  estandarMinimo: string | null; siNoSeHace: string | null;
  area: { nombre: string } | null;
};

// Resolver a qué usuarios se asigna (fan-out para area/todos)
async function resolverAsignados(template: TemplateConArea, areaCode: string): Promise<(string | null)[]> {
  const tipo = template.tipoAsignacion;
  if (tipo === "todos") {
    const users = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
    return users.length ? users.map((u) => u.id) : [null];
  }
  if (tipo === "area") {
    const users = await prisma.user.findMany({ where: { active: true, area: areaCode }, select: { id: true } });
    if (users.length) return users.map((u) => u.id);
    return template.responsableId ? [template.responsableId] : [null];
  }
  // individual
  return [template.responsableId ?? null];
}

// ── Motor principal: genera Tarea del día ────────────────────────────────────

export async function generarTareasDelDia(fecha: Date = new Date()): Promise<{
  generadas: number; subtareas: number; omitidas: number; errores: number;
}> {
  let generadas = 0, subtareas = 0, omitidas = 0, errores = 0;

  const templates = (await prisma.pTTareaTemplate.findMany({
    where: { activa: true },
    include: { area: { select: { nombre: true } } },
  })) as unknown as TemplateConArea[];

  const tz = "America/Mexico_City";
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: tz });
  const fechaTarea = new Date(`${dateStr}T12:00:00.000-06:00`);

  for (const template of templates) {
    try {
      if (!debeGenerarse(template, fecha)) continue;

      const areaCode = normalizeArea(template.area?.nombre ?? template.areaAsignada);
      const asignados = await resolverAsignados(template, areaCode);
      const { inicio, fin } = periodoWindow(template.frecuencia, fecha);
      const fechaVencimiento = calcularVencimiento(template, fecha);
      const ev = reglaEvidencia(template);
      const prioridad = impactoAPrioridad(template.impacto);

      const subActivas = await prisma.pTSubTarea.findMany({
        where: { templateId: template.id, activa: true },
        orderBy: { orden: "asc" },
      });

      let generoAlguna = false;

      for (const asignadoId of asignados) {
        const existe = await prisma.tarea.findFirst({
          where: {
            ptTemplateId: template.id,
            parentId: null,
            asignadoAId: asignadoId ?? null,
            fecha: { gte: inicio, lte: fin },
          },
          select: { id: true },
        });
        if (existe) { omitidas++; continue; }

        const tarea = await prisma.tarea.create({
          data: {
            titulo: template.nombre,
            descripcion: template.descripcion ?? undefined,
            prioridad,
            area: areaCode,
            estado: "PENDIENTE",
            tipoOrigen: "PLAN",
            ptTemplateId: template.id,
            asignadoAId: asignadoId ?? undefined,
            fecha: fechaTarea,
            fechaVencimiento,
            cuando: template.cuando ?? undefined,
            porqueSeHace: template.porqueSeHace ?? undefined,
            estandarMinimo: template.estandarMinimo ?? undefined,
            siNoSeHace: template.siNoSeHace ?? undefined,
            moduloDestino: template.moduloDestino ?? undefined,
            moduloTexto: template.moduloTexto ?? undefined,
            moduloDisponible: template.moduloDisponible,
            esAccionCampo: template.esAccionCampo,
            requiereEvidencia: ev.requiereEvidencia,
            tipoEvidencia: ev.tipoEvidencia,
          },
        });
        generadas++;
        generoAlguna = true;

        if (subActivas.length > 0) {
          await prisma.tarea.createMany({
            data: subActivas.map((st, i) => ({
              titulo: st.nombre,
              prioridad,
              area: areaCode,
              estado: "PENDIENTE",
              tipoOrigen: "PLAN",
              ptTemplateId: template.id,
              parentId: tarea.id,
              asignadoAId: asignadoId ?? undefined,
              fecha: fechaTarea,
              fechaVencimiento,
              orden: i,
              requiereEvidencia: false,
            })),
          });
          subtareas += subActivas.length;
        }
      }

      if (generoAlguna) {
        await prisma.pTTareaTemplate.update({
          where: { id: template.id },
          data: { ultimaTareaGeneradaAt: new Date() },
        });
      }
    } catch (err) {
      console.error(`[motor] Error en template ${template.id}:`, err);
      errores++;
    }
  }

  console.log(`[motor] ${dateStr}: ${generadas} tareas, ${subtareas} subtareas, ${omitidas} ya existían, ${errores} errores`);
  return { generadas, subtareas, omitidas, errores };
}
