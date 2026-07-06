import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/reportes/asistencias?mes=2026-06
// Reporte mensual de asistencias (solo días hábiles L-V)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 12);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Días hábiles L-V en el mes (sin sábados ni domingos)
  const diasHabiles: string[] = [];
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    const dow = cursor.getDay(); // 0=dom, 6=sab
    if (dow !== 0 && dow !== 6) {
      diasHabiles.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Personal activo (excluye Susana que es socia, no empleada)
  const personal = await prisma.personalInterno.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, puesto: true, departamento: true },
    orderBy: { nombre: "asc" },
  });

  // Asistencias del mes
  const asistencias = await prisma.asistencia.findMany({
    where: {
      fecha: { gte: start, lte: end },
      personalId: { in: personal.map(p => p.id) },
    },
    select: {
      id: true, personalId: true, fecha: true, estado: true,
      minutosRetardo: true, horaEntrada: true, horaSalida: true, notas: true,
    },
  });

  // Construir mapa: personalId → { fecha → registro }
  const mapaAsist: Record<string, Record<string, typeof asistencias[0]>> = {};
  for (const a of asistencias) {
    if (!mapaAsist[a.personalId]) mapaAsist[a.personalId] = {};
    const key = new Date(a.fecha).toISOString().slice(0, 10);
    mapaAsist[a.personalId][key] = a;
  }

  // Resumen por persona
  const resumenPersonal = personal.map(p => {
    const regs = mapaAsist[p.id] ?? {};
    let presentes = 0, retardos = 0, faltas = 0, permisos = 0, vacaciones = 0;
    let minRetardoTotal = 0;
    const detalleDias: { fecha: string; estado: string; minutosRetardo: number | null; notas: string | null }[] = [];

    for (const dia of diasHabiles) {
      const r = regs[dia];
      if (!r) {
        detalleDias.push({ fecha: dia, estado: "SIN_REGISTRO", minutosRetardo: null, notas: null });
        // No contamos faltas automáticas para días sin registro — puede ser futuro
      } else {
        const estado = r.estado;
        if (estado === "PRESENTE") presentes++;
        else if (estado === "RETARDO") { retardos++; presentes++; minRetardoTotal += r.minutosRetardo ?? 0; }
        else if (estado === "FALTA") faltas++;
        else if (estado === "PERMISO") permisos++;
        else if (estado === "VACACIONES") vacaciones++;
        detalleDias.push({ fecha: dia, estado, minutosRetardo: r.minutosRetardo, notas: r.notas });
      }
    }

    const diasRegistrados = presentes + retardos + faltas + permisos + vacaciones;
    const pctAsistencia = diasHabiles.length > 0 ? ((presentes / diasHabiles.length) * 100) : 0;

    return {
      id: p.id, nombre: p.nombre, puesto: p.puesto, departamento: p.departamento,
      presentes, retardos, faltas, permisos, vacaciones,
      diasRegistrados, totalHabiles: diasHabiles.length,
      pctAsistencia: Math.round(pctAsistencia * 10) / 10,
      minRetardoTotal,
      detalleDias,
    };
  });

  // Totales generales
  const totales = {
    presentes: resumenPersonal.reduce((s, p) => s + p.presentes, 0),
    retardos: resumenPersonal.reduce((s, p) => s + p.retardos, 0),
    faltas: resumenPersonal.reduce((s, p) => s + p.faltas, 0),
    permisos: resumenPersonal.reduce((s, p) => s + p.permisos, 0),
    vacaciones: resumenPersonal.reduce((s, p) => s + p.vacaciones, 0),
    diasHabiles: diasHabiles.length,
    totalPersonal: personal.length,
    pctAsistenciaGeneral: resumenPersonal.length > 0
      ? Math.round((resumenPersonal.reduce((s, p) => s + p.pctAsistencia, 0) / resumenPersonal.length) * 10) / 10
      : 0,
  };

  return NextResponse.json({
    periodo: mes,
    diasHabiles,
    personal: resumenPersonal,
    totales,
  });
}
