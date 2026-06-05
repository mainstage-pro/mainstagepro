/**
 * Motor de Recurrencia — Plan de Trabajo
 * Genera las instancias del día según la frecuencia definida en cada TareaTemplate.
 *
 * Zonas horarias: toda la lógica trabaja en America/Mexico_City.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers de fecha en zona México ──────────────────────────────────────────

function toMexicoDate(date: Date): Date {
  const str = date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return new Date(str + "T12:00:00.000-06:00");
}

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
  const lastDay = new Date(year, month, 0).getDate(); // último día del mes
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
      // Cada dos semanas en los días indicados — basado en número de semana del año
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
        const matchesSemana = template.semanaDeMes.some(s => {
          if (s === 5) return isLastWeekOfMonth(fecha) && template.diasSemana.includes(dow)
          return weekOfMonth === s && template.diasSemana.includes(dow)
        })
        return matchesSemana
      }
      // Retrocompat: empty semanaDeMes → show on all matching weekdays
      return template.diasSemana.includes(dow);

    case "TRIMESTRAL": {
      const month = getMexicoMonth(fecha);
      const isFirstMonthOfQuarter = [1, 4, 7, 10].includes(month);
      return isFirstMonthOfQuarter && weekOfMonth === 1 && template.diasSemana.includes(dow);
    }

    case "POR_EVENTO":
      return false; // Se genera manualmente al crear un proyecto

    default:
      return false;
  }
}

// ── Calcular la fecha/hora de vencimiento ────────────────────────────────────

function calcularVencimiento(template: {
  frecuencia: string;
  diasSemana: number[];
  horaLimite: string | null;
}, fecha: Date): Date {
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const hora = template.horaLimite ?? "23:59";
  // Construir fecha en México y convertir a UTC
  return new Date(`${dateStr}T${hora}:00.000-06:00`);
}

// ── Calcular la etiqueta del período ─────────────────────────────────────────

function calcularPeriodoLabel(template: { frecuencia: string }, fecha: Date): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: "America/Mexico_City" };
  const dow = new Intl.DateTimeFormat("es-MX", { ...opts, weekday: "long" }).format(fecha);
  const dom = getMexicoDayOfMonth(fecha);
  const mes = new Intl.DateTimeFormat("es-MX", { ...opts, month: "long" }).format(fecha);
  const year = getMexicoYear(fecha);

  switch (template.frecuencia) {
    case "DIARIO":
      return `${dow.charAt(0).toUpperCase() + dow.slice(1)} ${dom} ${mes}`;
    case "SEMANAL":
    case "QUINCENAL": {
      // Número de semana del año
      const start = new Date(year, 0, 1);
      const week = Math.ceil(((fecha.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
      return `Semana ${week} · ${year}`;
    }
    case "MENSUAL":
      return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${year}`;
    case "TRIMESTRAL": {
      const month = getMexicoMonth(fecha);
      const q = Math.ceil(month / 3);
      return `Q${q} ${year}`;
    }
    default:
      return `${dom} ${mes} ${year}`;
  }
}

// ── Motor principal ───────────────────────────────────────────────────────────

export async function generarInstanciasDelDia(fecha: Date = new Date()): Promise<{
  generadas: number;
  omitidas: number;
  errores: number;
}> {
  let generadas = 0;
  let omitidas = 0;
  let errores = 0;

  const templates = await prisma.pTTareaTemplate.findMany({
    where: { activa: true }, // genera para TODOS — con o sin responsable asignado
    include: { area: true, subArea: true },
  });

  // Rango de hoy en México (00:00 a 23:59:59)
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const inicioDelDia = new Date(`${dateStr}T00:00:00.000-06:00`);
  const finDelDia    = new Date(`${dateStr}T23:59:59.999-06:00`);

  for (const template of templates) {
    try {
      if (!debeGenerarse(template, fecha)) continue;

      // Verificar si ya existe una instancia para hoy
      const existe = await prisma.pTTareaInstancia.findFirst({
        where: {
          templateId: template.id,
          responsableId: template.responsableId!,
          fechaVencimiento: { gte: inicioDelDia, lte: finDelDia },
        },
      });

      if (existe) {
        omitidas++;
        continue;
      }

      const fechaVencimiento = calcularVencimiento(template, fecha);
      const periodoLabel = calcularPeriodoLabel(template, fecha);

      const instancia = await prisma.pTTareaInstancia.create({
        data: {
          templateId: template.id,
          responsableId: template.responsableId ?? undefined,
          fechaVencimiento,
          estado: "PENDIENTE",
          esEntregable: template.tipo === "ENTREGABLE",
          periodoLabel,
        },
      });

      // Crear instancias de subtareas si existen
      const subtareas = await prisma.pTSubTarea.findMany({
        where: { templateId: template.id, activa: true },
      });
      if (subtareas.length > 0) {
        await prisma.pTSubTareaInstancia.createMany({
          data: subtareas.map(st => ({
            subtareaId: st.id,
            instanciaId: instancia.id,
            completada: false,
          })),
        });
      }

      // Registrar en historial solo si hay responsable
      if (template.responsableId) {
        await prisma.pTHistorialEjecucion.create({
          data: {
            instanciaId: instancia.id,
            usuarioId: template.responsableId,
            accion: "CREADA",
            detalles: JSON.stringify({ periodoLabel, fechaVencimiento }),
          },
        });
      }

      generadas++;
    } catch (err) {
      console.error(`[motor] Error en template ${template.id}:`, err);
      errores++;
    }
  }

  console.log(`[motor] ${dateStr}: ${generadas} generadas, ${omitidas} ya existían, ${errores} errores`);
  return { generadas, omitidas, errores };
}

// ── Sweep de tareas vencidas ──────────────────────────────────────────────────
/**
 * Marca como VENCIDA todas las instancias PENDIENTE o EN_PROGRESO
 * cuya fechaVencimiento es anterior al inicio del día actual (México).
 * Debe ejecutarse ANTES de generarInstanciasDelDia en el cron.
 */
export async function marcarVencidasAnteriores(fecha: Date = new Date()): Promise<{ vencidas: number }> {
  const dateStr = fecha.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const inicioDeHoy = new Date(`${dateStr}T00:00:00.000-06:00`);

  const result = await prisma.pTTareaInstancia.updateMany({
    where: {
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      fechaVencimiento: { lt: inicioDeHoy },
    },
    data: { estado: "VENCIDA" },
  });

  console.log(`[motor] sweep vencidas: ${result.count} instancias marcadas como VENCIDA`);
  return { vencidas: result.count };
}
